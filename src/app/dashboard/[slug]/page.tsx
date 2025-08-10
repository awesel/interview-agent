"use client";
import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getBySlug, listSessions, InterviewerRecord, updateInterviewer } from '@/lib/interviewersService';
import Link from 'next/link';

export default function DashboardDetailPage({ params }: { params: Promise<{ slug: string }> }){
  // unwrap promise-based params (Next.js 15+)
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
        {subTab==='results' && <ResultsPlaceholder record={record} />}
      </div>
    </main>
  );
}

function DetailSidebar({ record, subTab, setSubTab, sessions }: any){
  const share = typeof window!=='undefined'? `${window.location.origin}/signup/candidate?next=%2Finterview%2F${record.slug}`: '';
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
