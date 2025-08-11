"use client";
import { useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import { createInterviewer as svcCreate, listInterviewers } from '@/lib/interviewersService';
import { useRouter } from 'next/navigation';
import ScriptForm from '@/components/ScriptForm';
import { ScriptT } from '@/lib/types';

export default function CreateInterviewPage(){
  const user = auth?.currentUser;
  const router = useRouter();
  const [name, setName] = useState("");
  const [script, setScript] = useState<ScriptT | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function create(){
    if(!user) return;
    setCreating(true); setError(null);
    try {
      const existing = await listInterviewers(user.uid);
      const payload: ScriptT = script || { title: name || 'Untitled Interview', sections: [] };
      await svcCreate({ ownerUid: user.uid, name, script: payload, order: existing.length });
      router.replace('/dashboard');
    } catch(e){
      setError((e as Error)?.message || 'Failed');
    } finally { setCreating(false); }
  }

  const formValid = useMemo(()=>{
    if(!name.trim()) return false;
    if(!script) return false;
    if(!script.sections || script.sections.length === 0) return false;
    const hasPrompt = script.sections.some(s=> (s.prompt||'').trim().length>0);
    return hasPrompt;
  },[name, script]);

  return (
    <main style={{minHeight:'calc(100dvh - 56px)'}}>
      <div style={{padding:'1.5rem'}}>
        <div className='card' style={{maxWidth:900, margin:'0 auto', display:'grid', gap:'1.25rem'}}>
          <div>
            <h1 style={{margin:0, fontSize:'1.5rem'}}>Create Interview</h1>
            <p style={{fontSize:'0.7rem', color:'var(--foreground-soft)', marginTop:6}}>Name your interview and add questions with time limits.</p>
          </div>
          <input placeholder='Interview name' value={name} onChange={e=>setName(e.target.value)} />
          <ScriptForm externalTitle={name} value={undefined} onChange={setScript} />
          {error && <div style={{fontSize:'0.65rem', color:'var(--danger)'}}>{error}</div>}
          <div style={{display:'flex', gap:8}}>
            <button className='btn' disabled={!formValid || creating} onClick={create}>{creating? 'Creating...' : 'Create'}</button>
            <button type='button' className='btn-outline' onClick={()=>router.back()}>Cancel</button>
          </div>
        </div>
      </div>
    </main>
  )
}
// TopBar removed – provided by shared dashboard layout
