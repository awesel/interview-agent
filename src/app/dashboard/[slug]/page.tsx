"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getBySlug, listSessions, InterviewerRecord, updateInterviewer } from '@/lib/interviewersService';
import Link from 'next/link';
import { Utterance } from '@/lib/types';

export default function DashboardDetailPage({ params }: { params: Promise<{ slug: string }> }){
  // unwrap promise params (Next.js 15+)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { slug } = React.use(params);
  const user = auth.currentUser;
  const [record,setRecord]=useState<InterviewerRecord|null>(null);
  const [recordLoading,setRecordLoading]=useState(true);
  const [sessions,setSessions]=useState<any[]>([]);
  const [sessionsLoading,setSessionsLoading]=useState(true);
  const [subTab,setSubTab]=useState<'overview'|'sessions'|'results'>('overview');

  useEffect(()=>{ if(!slug) return; let cancelled=false; (async function load(){
    setRecordLoading(true); setSessionsLoading(true);
    try {
      const rec = await getBySlug(slug);
      if(cancelled) return;
      setRecord(rec);
      setRecordLoading(false);
      if(!rec){ setSessions([]); setSessionsLoading(false); return; }
      // Load sessions separately without blocking showing main UI
      try { const sess = await listSessions(rec.id, 50); if(!cancelled) setSessions(sess);} finally { if(!cancelled) setSessionsLoading(false);}    
    } catch {
      if(!cancelled){ setRecord(null); setRecordLoading(false); setSessionsLoading(false); }
    }
  })(); return ()=>{cancelled=true}; },[slug]);

  if(recordLoading) return <CenteredSpinner label={`Loading ${slug.slice(0,8)}…`} />;
  if(!record) return <main style={{display:'grid', placeItems:'center', minHeight:'100dvh'}}><div className='card' style={{padding:'2rem', textAlign:'center'}}><p style={{fontSize:'0.8rem', margin:0}}>Interview not found.</p><Link href='/dashboard' style={{fontSize:'0.65rem', marginTop:12, display:'inline-block'}}>Back to Dashboard</Link></div></main>;

  return (
    <main style={{display:'flex', height:'calc(100dvh - 56px)'}}>
      <DetailSidebar record={record} subTab={subTab} setSubTab={setSubTab} sessions={sessions} />
      <div style={{flex:1, minWidth:0, overflow:'auto', padding:'1.25rem 1.5rem'}}>
        {subTab==='overview' && <Overview record={record} onUpdated={(r)=>setRecord(r)} />}
        {subTab==='sessions' && <SessionsList sessions={sessions} loading={sessionsLoading} />}
        {subTab==='results' && <ResultsAnalytics record={record} sessions={sessions} />}
      </div>
    </main>
  );
}

function DetailSidebar({ record, subTab, setSubTab, sessions }: any){
  const share = typeof window!=='undefined'? `${window.location.origin}/interview/${record.slug}`: '';
  const Btn=({id,label}:{id:string,label:string})=> <button onClick={()=>setSubTab(id)} style={{textAlign:'left', background: subTab===id? '#fff':'#eef7ff', border:'1px solid #bcdaf3', padding:'6px 10px', fontSize:'0.6rem', borderRadius:8, cursor:'pointer', fontWeight: subTab===id?600:500}}>{label}</button>;
  return (
    <aside style={{width:230, borderRight:'1px solid #d4e6f9', padding:'1rem', display:'flex', flexDirection: 'column', gap:'1rem', background:'#f4fbff'}}>
      <div style={{display:'grid', gap:6}}>
        <div style={{fontSize:'0.75rem', fontWeight:600}}>{record.name}</div>
        <div style={{fontSize:'0.5rem', color:'var(--foreground-soft)'}}>{record.slug}</div>
      </div>
      <div style={{display:'grid', gap:6}}>
        <Btn id='overview' label='Overview' />
        <Btn id='sessions' label={`Sessions (${sessions.length})`} />
        <Btn id='results' label='Results' />
      </div>
      <div className='card' style={{padding:'0.6rem', display:'grid', gap:6}}>
        <div style={{fontSize:'0.55rem', fontWeight:600}}>Share Link</div>
        <div style={{display:'flex', gap:4, alignItems:'center'}}>
          <input readOnly value={share} style={{fontSize:'0.5rem', padding:'4px 6px', flex:1}} />
          <button className='btn-outline' style={{fontSize:'0.5rem'}} onClick={()=>navigator.clipboard.writeText(share)}>Copy</button>
        </div>
      </div>
    </aside>
  );
}

function Overview({ record, onUpdated }: { record: InterviewerRecord; onUpdated:(r:InterviewerRecord)=>void }){
  const [edit,setEdit]=React.useState(false);
  const [text,setText]=React.useState(()=>JSON.stringify(record.script, null, 2));
  const [saving,setSaving]=React.useState(false);
  const [error,setError]=React.useState<string|null>(null);
  React.useEffect(()=>{ if(!edit) setText(JSON.stringify(record.script, null, 2)); },[record, edit]);

  async function save(){
    setError(null);
    let parsed:any;
    try { parsed = JSON.parse(text); } catch(e:any){ setError('Invalid JSON: '+ (e.message||'Parse error')); return; }
    setSaving(true);
    try {
      await updateInterviewer(record.id, { script: parsed });
      onUpdated({...record, script: parsed});
      setEdit(false);
    } catch(e:any){
      setError(e.message||'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <div className='card' style={{display:'grid', gap:'1rem', maxWidth:1000}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16}}>
        <div>
          <h2 style={{margin:0, fontSize:'1.25rem', fontWeight:700}}>{record.name}</h2>
          <div style={{fontSize:'0.55rem', color:'var(--foreground-soft)', marginTop:4}}>Created {new Date(record.createdAt).toLocaleDateString()}</div>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <div style={{fontSize:'0.55rem', background:'#e1f0ff', padding:'6px 10px', borderRadius:8}}>ID: {record.slug.slice(0,8)}</div>
          {!edit && <button className='btn-outline' style={{fontSize:'0.6rem'}} onClick={()=>setEdit(true)}>Edit JSON</button>}
        </div>
      </div>
      <div>
        <h3 style={{fontSize:'0.8rem', margin:'0 0 8px'}}>Script JSON</h3>
        {!edit && (
          <pre style={{maxHeight:360, overflow:'auto', fontSize:'0.55rem', background:'#f4faff', border:'1px solid #d4e6f9', padding:'12px 14px', borderRadius:12}}>{JSON.stringify(record.script, null, 2)}</pre>
        )}
        {edit && (
          <div style={{display:'grid', gap:8}}>
            <textarea value={text} onChange={e=>setText(e.target.value)} rows={18} style={{fontFamily:'var(--font-mono)', fontSize:'0.6rem'}} />
            {error && <div style={{fontSize:'0.6rem', color:'var(--danger)'}}>{error}</div>}
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              <button disabled={saving} className='btn' onClick={save}>{saving? 'Saving...' : 'Save'}</button>
              <button type='button' className='btn-outline' disabled={saving} onClick={()=>{ try { setText(JSON.stringify(JSON.parse(text), null, 2)); } catch { setError('Cannot format invalid JSON'); } }}>Format</button>
              <button type='button' className='btn-outline' disabled={saving} onClick={()=>{ setEdit(false); setError(null); setText(JSON.stringify(record.script, null, 2)); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionsList({ sessions, loading }: { sessions:any[]; loading:boolean }){
  if(loading) return <div style={{fontSize:'0.6rem', color:'var(--foreground-soft)'}}>Loading sessions…</div>;
  if(sessions.length===0) return <div style={{fontSize:'0.65rem', color:'var(--foreground-soft)'}}>No sessions yet.</div>;
  return (
    <div style={{display:'grid', gap:'0.75rem'}}>
      {sessions.map(s=> (
        <div key={s.id} className='card' style={{padding:'0.75rem 1rem'}}>
          <div style={{fontSize:'0.7rem', fontWeight:600}}>Session {s.id.slice(0,6)}</div>
          <div style={{fontSize:'0.55rem', color:'var(--foreground-soft)'}}>{new Date(s.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function ResultsPlaceholder({ record }: { record: InterviewerRecord }){
  return (
    <div className='card' style={{display:'grid', gap:'0.8rem'}}>
      <h2 style={{margin:0, fontSize:'1rem'}}>Results (Coming Soon)</h2>
      <p style={{fontSize:'0.7rem', color:'var(--foreground-soft)', lineHeight:1.4}}>Analytics and insights for <strong>{record.name}</strong> will appear here.</p>
      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
        {['Charts','Scoring','Transcript Chat','Exports','Candidates'].map(t=> <span key={t} style={{fontSize:'0.5rem', background:'#e1f0ff', padding:'4px 8px', borderRadius:20}}>{t}</span>)}
      </div>
    </div>
  );
}

// ============ RESULTS ============

type ResultsAnalyticsProps = { record: InterviewerRecord; sessions: any[] };

function ResultsAnalytics({ record, sessions }: ResultsAnalyticsProps){
  const sections: Array<{ id:string; prompt:string }>= Array.isArray(record?.script?.sections) ? record.script.sections.map((s:any)=>({ id: String(s.id), prompt: String(s.prompt||'') })) : [];

  const { bySection, byParticipant, totalSessions } = useMemo(()=>computeAggregates(sessions as any[], sections), [sessions, sections]);

  return (
    <div className='card' style={{display:'grid', gap:'0.9rem'}}>
      <h2 style={{margin:0, fontSize:'1rem'}}>Results</h2>
      <Collapsible title={`Total Sessions`} defaultOpen>
        <div style={{fontSize:'0.85rem', fontWeight:700}}>{totalSessions}</div>
        <div style={{fontSize:'0.6rem', color:'var(--foreground-soft)'}}>Count of recorded sessions for this interview.</div>
      </Collapsible>

      <Collapsible title="Average responses per question" defaultOpen>
        {sections.length===0 && <div style={{fontSize:'0.6rem', color:'var(--foreground-soft)'}}>No sections found.</div>}
        {sections.map(sec=>{
          const m = bySection.get(sec.id);
          const avg = m && m.sessionsWithData>0 ? (m.totalCandidateTurns/m.sessionsWithData) : 0;
          return (
            <div key={sec.id} style={{display:'grid', gap:4, margin:'8px 0'}}>
              <div style={{fontSize:'0.7rem', fontWeight:600}}>{sec.id}</div>
              <div style={{fontSize:'0.6rem'}}>Avg candidate responses: <b>{avg.toFixed(2)}</b></div>
            </div>
          );
        })}
      </Collapsible>

      <Collapsible title="Word clouds per question">
        {sections.map(sec=>{
          const m = bySection.get(sec.id);
          const words = m?.topWords || [];
          return (
            <div key={sec.id} style={{display:'grid', gap:6, margin:'10px 0'}}>
              <div style={{fontSize:'0.7rem', fontWeight:600}}>{sec.id}</div>
              {words.length===0 && <div style={{fontSize:'0.6rem', color:'var(--foreground-soft)'}}>No responses yet.</div>}
              {words.length>0 && (
                <div style={{display:'flex', flexWrap:'wrap', gap:8, alignItems:'flex-end'}}>
                  {words.slice(0,40).map(([w,c])=>{
                    const size = 10 + Math.min(24, Math.round((c/(words[0]?.[1]||1))*24));
                    const opacity = 0.5 + Math.min(0.5, (c/(words[0]?.[1]||1))*0.5);
                    return <span key={w} style={{fontSize:`${size}px`, opacity, lineHeight:1}}>{w}</span>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </Collapsible>

      <Collapsible title="Sentiment by question">
        {sections.map(sec=>{
          const m = bySection.get(sec.id);
          const score = m?.sentimentAvg ?? 0;
          return (
            <div key={sec.id} style={{margin:'8px 0'}}>
              <div style={{fontSize:'0.7rem', fontWeight:600, marginBottom:6}}>{sec.id}</div>
              <SentimentBar score={score} />
            </div>
          );
        })}
      </Collapsible>

      <Collapsible title="Ask questions about the data" defaultOpen>
        <ResultsChat sections={sections} bySection={bySection} byParticipant={byParticipant} />
      </Collapsible>
    </div>
  );
}

function Collapsible({ title, children, defaultOpen=false }: { title:string; children: React.ReactNode; defaultOpen?: boolean }){
  const [open,setOpen]=React.useState(defaultOpen);
  return (
    <div className='card' style={{padding:'0.75rem 0.9rem', border:'1px solid #d4e6f9'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:'flex', justifyContent:'space-between', width:'100%', background:'transparent', border:'none', cursor:'pointer', padding:0, margin:0}}>
        <div style={{fontSize:'0.8rem', fontWeight:700}}>{title}</div>
        <div style={{fontSize:'0.8rem'}}>{open? '▾':'▸'}</div>
      </button>
      {open && <div style={{marginTop:10}}>{children}</div>}
    </div>
  );
}

function SentimentBar({ score }: { score:number }){
  // score in [-1,1]
  const pct = Math.round((score+1)*50); // 0..100
  const color = score>0.2? '#2dbc82' : score<-0.2? '#e35d6a' : '#eeb755';
  return (
    <div style={{display:'grid', gap:6}}>
      <div style={{height:10, background:'#f1f6fd', borderRadius:6, overflow:'hidden', position:'relative'}}>
        <div style={{position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background:color, transition:'width 200ms'}} />
      </div>
      <div style={{fontSize:'0.6rem', color:'var(--foreground-soft)'}}>Average sentiment score: {score.toFixed(2)} (-1 to 1)</div>
    </div>
  );
}

type SectionAgg = {
  totalCandidateTurns: number;
  sessionsWithData: number;
  topWords: Array<[string, number]>;
  sentimentAvg: number;
  quotes: string[];
};

function computeAggregates(sessions:any[], sections: Array<{id:string; prompt:string}>){
  const bySection = new Map<string, SectionAgg>();
  const byParticipant = new Map<string, { label:string; quotes:string[] }>();
  const sectionIds = new Set(sections.map(s=>s.id));

  function addParticipantQuote(sess:any, text:string){
    const p = sess?.participant?.email || sess?.participantSnapshot?.email || sess?.participant?.name || sess?.participantSnapshot?.name || 'Unknown';
    const label = typeof p==='string'? p : 'Unknown';
    const cur = byParticipant.get(label) || { label, quotes: [] };
    if(text) cur.quotes.push(text);
    byParticipant.set(label, cur);
  }

  // Build per-section
  for(const s of sections){
    bySection.set(s.id, { totalCandidateTurns:0, sessionsWithData:0, topWords:[], sentimentAvg:0, quotes: [] });
  }

  const perSectionTexts: Record<string,string[]> = Object.fromEntries(sections.map(s=>[s.id, []]));
  const perSectionSentiments: Record<string, number[]> = Object.fromEntries(sections.map(s=>[s.id, []]));
  const perSectionQuotes: Record<string, string[]> = Object.fromEntries(sections.map(s=>[s.id, []]));

  const totalSessions = sessions.length;
  for(const sess of sessions){
    const transcript: Utterance[] = Array.isArray(sess?.transcript)? sess.transcript : [];
    const seen = new Set<string>();
    for(const u of transcript){
      if(u?.speaker === 'candidate' && sectionIds.has(String(u.sectionId))){
        const id = String(u.sectionId);
        perSectionTexts[id].push(u.text || '');
        perSectionSentiments[id].push(sentimentScore(u.text||''));
        if(u.text) perSectionQuotes[id].push(u.text);
        addParticipantQuote(sess, u.text||'');
        if(!seen.has(id)) { seen.add(id); }
      }
    }
    for(const id of seen){
      const agg = bySection.get(id)!;
      agg.sessionsWithData += 1;
      bySection.set(id, agg);
    }
  }

  for(const s of sections){
    const id = s.id;
    const texts = perSectionTexts[id];
    const turnsBySession = []; // fallback: approximate by total turns / sessionsWithData
    const agg = bySection.get(id)!;
    agg.totalCandidateTurns = texts.length;
    const avgSent = perSectionSentiments[id].length? (perSectionSentiments[id].reduce((a,b)=>a+b,0)/perSectionSentiments[id].length) : 0;
    agg.sentimentAvg = avgSent;
    agg.quotes = perSectionQuotes[id];
    // words
    const freq = new Map<string, number>();
    for(const t of texts){ for(const w of tokenize(t)){ freq.set(w, (freq.get(w)||0)+1); } }
    agg.topWords = Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]);
    bySection.set(id, agg);
  }

  return { bySection, byParticipant, totalSessions };
}

const STOPWORDS = new Set<string>([
  'the','a','an','and','or','but','if','then','than','that','this','those','these','to','of','for','in','on','at','by','is','it','its','be','are','was','were','i','you','we','they','he','she','as','with','from','so','not','have','has','had','do','did','done','my','our','your','their','me','us','him','her','them','just','like','really','very','can','could','would','should','about','into','over','under','out','up','down','across','because','also','there','here','what','when','where','why','how','which'
]);

function tokenize(s:string): string[]{
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g,' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w=>!STOPWORDS.has(w))
}

// super-lightweight sentiment
const POS = new Set(['good','great','excellent','positive','love','like','enjoy','helpful','clear','easy','fast','improve','success','benefit','happy','confident']);
const NEG = new Set(['bad','poor','terrible','negative','hate','dislike','confusing','hard','slow','issue','problem','bug','error','fail','difficult','worried']);
function sentimentScore(s:string): number{
  let score = 0;
  for(const w of tokenize(s)){
    if(POS.has(w)) score += 1;
    if(NEG.has(w)) score -= 1;
  }
  if(score===0) return 0;
  // normalize to [-1,1] roughly by tanh-like clamp
  return Math.max(-1, Math.min(1, score/8));
}

function ResultsChat({ sections, bySection, byParticipant }:{ sections:Array<{id:string;prompt:string}>; bySection:Map<string,SectionAgg>; byParticipant:Map<string,{label:string;quotes:string[]}> }){
  const [mode,setMode]=useState<'question'|'participant'>('question');
  const [selected,setSelected]=useState<string>(sections[0]?.id || '');
  const [q,setQ]=useState('What are the main themes?');
  const [answer,setAnswer]=useState<string>('');
  const [loading,setLoading]=useState(false);

  const participantList = Array.from(byParticipant.values());
  const contextQuotes = mode==='question' ? (bySection.get(selected)?.topWords, gatherQuotesForSection(bySection, selected)) : (byParticipant.get(selected)?.quotes || []);

  async function ask(){
    setLoading(true); setAnswer('');
    try{
      const res = await fetch('/api/results-chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ question:q, context: { type: mode, key: selected, quotes: contextQuotes } })
      });
      const data = await res.json();
      if(res.ok){ setAnswer(data.text||''); } else { setAnswer(data.error||'Failed'); }
    }catch(e:any){ setAnswer('Failed to ask.'); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ if(mode==='question' && sections.length>0) setSelected(sections[0].id); if(mode==='participant' && participantList.length>0) setSelected(participantList[0].label); },[mode]);

  return (
    <div style={{display:'grid', gap:10}}>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <select value={mode} onChange={e=>setMode(e.target.value as any)} style={{fontSize:'0.6rem', padding:'4px 8px', border:'1px solid #bcdaf3', borderRadius:8}}>
          <option value='question'>Context: One question (all responses)</option>
          <option value='participant'>Context: One participant (all responses)</option>
        </select>
        {mode==='question' && (
          <select value={selected} onChange={e=>setSelected(e.target.value)} style={{fontSize:'0.6rem', padding:'4px 8px', border:'1px solid #bcdaf3', borderRadius:8}}>
            {sections.map(s=> <option key={s.id} value={s.id}>{s.id}</option>)}
          </select>
        )}
        {mode==='participant' && (
          <select value={selected} onChange={e=>setSelected(e.target.value)} style={{fontSize:'0.6rem', padding:'4px 8px', border:'1px solid #bcdaf3', borderRadius:8}}>
            {participantList.map(p=> <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        )}
      </div>
      <div style={{display:'grid', gap:6}}>
        <textarea value={q} onChange={e=>setQ(e.target.value)} rows={3} placeholder='Ask about the data…' style={{fontSize:'0.65rem', fontFamily:'inherit', padding:8, border:'1px solid #cfe1f7', borderRadius:10}} />
        <div style={{display:'flex', gap:8}}>
          <button className='btn' onClick={ask} disabled={loading || contextQuotes.length===0}>{loading? 'Asking…':'Ask'}</button>
          <div style={{fontSize:'0.6rem', color:'var(--foreground-soft)'}}>{contextQuotes.length} quotes in context</div>
        </div>
      </div>
      {answer && (
        <div className='card' style={{background:'#f7fbff'}}>
          <div style={{whiteSpace:'pre-wrap', fontSize:'0.7rem'}}>{answer}</div>
        </div>
      )}
      {contextQuotes.length===0 && <div style={{fontSize:'0.6rem', color:'var(--foreground-soft)'}}>No context available yet.</div>}
    </div>
  );
}

function gatherQuotesForSection(bySection: Map<string, SectionAgg>, sectionId: string): string[]{
  return bySection.get(sectionId)?.quotes || [];
}

function CenteredSpinner({ label }: { label?: string }){
  return (
    <div style={{display:'grid', placeItems:'center', minHeight:'100dvh'}}>
      <div style={{display:'grid', gap:12, justifyItems:'center'}}>
        <div className='spinner' style={{width:46, height:46, border:'4px solid #c9e4f9', borderTopColor:'#3294ff', borderRadius:'50%', animation:'spin 0.9s linear infinite'}} />
        {label && <div style={{fontSize:'0.65rem', color:'var(--foreground-soft)'}}>{label}</div>}
      </div>
    </div>
  );
}

// Footer removed for unified minimal layout
