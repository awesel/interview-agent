"use client";
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { listSessions, getBySlug, listInterviewers, InterviewerRecord, updateInterviewer } from '@/lib/interviewersService';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function InterviewDetailPage(){
  const router = useRouter();
  const params = useParams();
  const slug = params?.id as string;
  const user = auth.currentUser;
  const [interview, setInterview] = useState<InterviewerRecord|null>(null);
  const [loading, setLoading] = useState(true);
  interface Session {
  id: string;
  createdAt: string;
  transcript?: Array<{
    speaker: 'candidate' | 'interviewer';
    text?: string;
    sectionId?: string;
  }>;
}

const [sessions, setSessions] = useState<Session[]>([]);
  const [tab, setTab] = useState<'overview'|'sessions'|'results'>('overview');
  const [editName, setEditName] = useState('');
  const [editJson, setEditJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(()=>{
    const active = true;
    async function load(){
      if(!user){ setLoading(false); return; }
      // Try slug lookup first
      const bySlug = await getBySlug(slug);
      if(bySlug && bySlug.ownerUid === user.uid){
        if(!active) return;
        setInterview(bySlug);
        setEditName(bySlug.name);
        setEditJson(JSON.stringify(bySlug.script, null, 2));
        const sess = await listSessions(bySlug.id, 50);
        if(active) setSessions(sess);
      } else {
        // fallback: maybe slug is actually id (list & match)
        const list = await listInterviewers(user.uid);
        const match = list.find(l=> l.id === slug);
        if(match){
          setInterview(match);
          setEditName(match.name);
          setEditJson(JSON.stringify(match.script, null, 2));
          const sess = await listSessions(match.id, 50);
          if(active) setSessions(sess);
        }
      }
      if(active) setLoading(false);
    }
    load();
    return ()=>{ active=false; };
  },[slug, user]);

  async function saveEdits(){
    if(!interview) return;
    setSaving(true); setError(null);
    try {
      const parsed = JSON.parse(editJson);
      await updateInterviewer(interview.id, { name: editName, script: parsed });
      setInterview({...interview, name: editName, script: parsed});
    } catch(e){
      setError(e.message||'Failed');
    } finally { setSaving(false); }
  }

  function shareLink(sl: string){
    const origin = typeof window !== 'undefined'? window.location.origin: '';
    return origin + '/interview/' + sl;
  }

  return (
    <main style={{display:'grid', gridTemplateRows:'56px 1fr', minHeight:'100dvh'}}>
      <TopBar />
      <div style={{display:'grid', gridTemplateColumns:'240px 1fr', minHeight:0}}>
        <Sidebar interview={interview} tab={tab} setTab={setTab} sessions={sessions} shareLink={shareLink} />
        <div style={{padding:'1.2rem 1.5rem', overflow:'auto'}}>
          {loading && <div style={{fontSize:'0.7rem'}}>Loading...</div>}
          {!loading && !interview && <div className='card' style={{fontSize:'0.75rem'}}>Not found or you do not have access. <button className='btn-outline' style={{fontSize:'0.6rem'}} onClick={()=>router.replace('/dashboard')}>Back</button></div>}
          {!loading && interview && (
            <div style={{display:'grid', gap:'1.5rem'}}>
              {tab === 'overview' && (
                <div className='card' style={{display:'grid', gap:'1rem'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                      <h1 style={{margin:0, fontSize:'1.35rem'}}>{interview.name}</h1>
                      <div style={{fontSize:'0.55rem', color:'var(--foreground-soft)', marginTop:4}}>Created {new Date(interview.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{fontSize:'0.55rem', background:'#e1f0ff', padding:'6px 10px', borderRadius:8}}>{interview.slug.slice(0,8)}</div>
                  </div>
                  <div style={{display:'grid', gap:'0.6rem'}}>
                    <label style={{fontSize:'0.55rem', fontWeight:600}}>Name</label>
                    <input value={editName} onChange={e=>setEditName(e.target.value)} />
                    <label style={{fontSize:'0.55rem', fontWeight:600}}>Script JSON</label>
                    <textarea rows={16} value={editJson} onChange={e=>setEditJson(e.target.value)} style={{fontFamily:'var(--font-mono)', fontSize:'0.6rem'}} />
                    {error && <div style={{fontSize:'0.6rem', color:'var(--danger)'}}>{error}</div>}
                    <div style={{display:'flex', gap:8}}>
                      <button className='btn' disabled={saving} onClick={saveEdits}>{saving? 'Saving...' : 'Save Changes'}</button>
                      <button type='button' className='btn-outline' style={{fontSize:'0.6rem'}} onClick={()=>{ try { setEditJson(JSON.stringify(JSON.parse(editJson), null, 2)); } catch {}}}>Format JSON</button>
                    </div>
                  </div>
                </div>
              )}
              {tab === 'sessions' && (
                <div style={{display:'grid', gap:'1rem'}}>
                  <h2 style={{fontSize:'1rem', fontWeight:600, margin:0}}>Recent Sessions</h2>
                  {sessions.length === 0 && <div style={{fontSize:'0.65rem', color:'var(--foreground-soft)'}}>No sessions yet.</div>}
                  <div style={{display:'grid', gap:'0.7rem'}}>
                    {sessions.map(s => (
                      <div key={s.id} className='card' style={{padding:'0.75rem 1rem'}}>
                        <div style={{fontSize:'0.7rem', fontWeight:600}}>Session {s.id.slice(0,6)}</div>
                        <div style={{fontSize:'0.55rem', color:'var(--foreground-soft)'}}>{new Date(s.createdAt).toLocaleString()}</div>
                        {Array.isArray(s?.transcript) && s.transcript.length>0 && (()=>{
                          const groupedBySection: Record<string, string[]> = s.transcript.reduce(
                            (acc: Record<string, string[]>, u: Session['transcript'][0]) => {
                              if (u && u.speaker === 'candidate' && u.sectionId) {
                                const key = String(u.sectionId);
                                if (!acc[key]) acc[key] = [];
                                if (u.text) acc[key].push(String(u.text));
                              }
                              return acc;
                            },
                            {} as Record<string, string[]>
                          );
                          return (
                            <div style={{marginTop:8, display:'grid', gap:6}}>
                              {Object.entries(groupedBySection).map(([sectionId, answers]) => (
                                <div key={sectionId} style={{display:'grid', gap:4}}>
                                  <div style={{fontSize:'0.6rem', fontWeight:600}}>Q: {sectionId}</div>
                                  <div style={{display:'grid', gap:4}}>
                                    {answers.slice(0, 3).map((ans: string, idx: number) => (
                                      <div key={idx} style={{fontSize:'0.55rem', color:'#1e2a3b'}}>
                                        {ans.length > 220 ? ans.slice(0, 220) + '…' : ans}
                                      </div>
                                    ))}
                                    {answers.length > 3 && (
                                      <div style={{fontSize:'0.5rem', color:'var(--foreground-soft)'}}>+{answers.length - 3} more</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tab === 'results' && (
                <div className='card' style={{display:'grid', gap:'0.75rem'}}>
                  <h2 style={{fontSize:'1rem', fontWeight:600, margin:0}}>Results (Coming Soon)</h2>
                  <p style={{fontSize:'0.7rem', color:'var(--foreground-soft)', lineHeight:1.4}}>Future visual analytics, transcript exploration, scoring and exports will appear here.</p>
                  <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                    {['Charts','Transcript Chat','Insights','Exports','Candidates'].map(tag => <span key={tag} style={{fontSize:'0.5rem', background:'#e1f0ff', padding:'4px 8px', borderRadius:20}}>{tag}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function TopBar(){
  return (
    <div style={{height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem', borderBottom:'1px solid #d4e6f9', background:'#ffffffdd', backdropFilter:'blur(8px)', position:'sticky', top:0, zIndex:30}}>
      <div style={{display:'flex', alignItems:'center', gap:14}}>
        <Link href='/dashboard' style={{fontWeight:700, fontSize:'1rem', textDecoration:'none', color:'inherit'}}>OpenEar</Link>
        <Link href='/dashboard' className='btn-outline' style={{fontSize:'0.6rem', textDecoration:'none'}}>View All</Link>
        <Link href='/dashboard/create' className='btn-outline' style={{fontSize:'0.6rem', textDecoration:'none'}}>Create</Link>
      </div>
    </div>
  );
}

interface SidebarProps {
  interview: InterviewerRecord;
  tab: 'overview' | 'sessions' | 'results';
  setTab: (tab: 'overview' | 'sessions' | 'results') => void;
  sessions: Session[];
  shareLink: (slug: string) => string;
}

function Sidebar({ interview, tab, setTab, sessions, shareLink }: SidebarProps){
  if(!interview) return <aside style={{borderRight:'1px solid #d4e6f9', padding:'1rem', fontSize:'0.6rem'}}>Loading...</aside>;
  const link = shareLink(interview.slug);
  return (
    <aside style={{borderRight:'1px solid #d4e6f9', padding:'1rem', display:'grid', gap:'1rem', alignContent:'start', background:'#f5faff'}}>
      <div style={{display:'grid', gap:6}}>
        <div style={{fontSize:'0.75rem', fontWeight:600}}>{interview.name}</div>
        <div style={{fontSize:'0.5rem', color:'var(--foreground-soft)'}}>{interview.slug.slice(0,12)}</div>
        <Link href={`/interview/${interview.slug}`} target='_blank' style={{fontSize:'0.55rem', textDecoration:'none', color:'var(--blue)'}}>Open Public Link</Link>
        <div style={{display:'grid', gap:4}}>
          <button onClick={()=>setTab('overview')} style={btn(tab==='overview')}>Overview</button>
          <button onClick={()=>setTab('sessions')} style={btn(tab==='sessions')}>Sessions ({sessions.length})</button>
          <button onClick={()=>setTab('results')} style={btn(tab==='results')}>Results</button>
        </div>
      </div>
      <div style={{display:'grid', gap:4}}>
        <div style={{fontSize:'0.55rem', fontWeight:600}}>Share Link</div>
        <div style={{display:'flex', gap:4}}>
          <input readOnly value={link} style={{fontSize:'0.5rem', padding:'4px 6px', flex:1}} />
          <button className='btn-outline' style={{fontSize:'0.5rem'}} onClick={()=>navigator.clipboard.writeText(link)}>Copy</button>
        </div>
      </div>
    </aside>
  );
}

function btn(active: boolean): React.CSSProperties {
  return {
    textAlign:'left',
    background: active? '#fff':'#ffffffaa',
    border:'1px solid #bcdaf3',
    padding:'6px 8px',
    fontSize:'0.55rem',
    borderRadius:6,
    cursor:'pointer',
    fontWeight: active?600:500
  }
}
