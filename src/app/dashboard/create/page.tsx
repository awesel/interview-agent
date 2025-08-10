"use client";
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { createInterviewer as svcCreate, listInterviewers } from '@/lib/interviewersService';
import { useRouter } from 'next/navigation';

export default function CreateInterviewPage(){
  const user = auth.currentUser;
  const router = useRouter();
  const [name, setName] = useState("");
  const [json, setJson] = useState("{\n  \"title\": \"Sample Interview\",\n  \"sections\": [\n    { \"id\": \"intro\", \"prompt\": \"Tell me about yourself\", \"targetDurationSec\": 60 }\n  ]\n}");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function create(){
    if(!user) return;
    setCreating(true); setError(null);
    try {
      const script = JSON.parse(json);
      const existing = await listInterviewers(user.uid);
      await svcCreate({ ownerUid: user.uid, name, script, order: existing.length });
      router.replace('/dashboard');
    } catch(e:any){
      setError(e.message||'Failed');
    } finally { setCreating(false); }
  }

  return (
    <main style={{minHeight:'calc(100dvh - 56px)'}}>
      <div style={{padding:'1.5rem'}}>
        <div className='card' style={{maxWidth:900, margin:'0 auto', display:'grid', gap:'1.25rem'}}>
          <div>
            <h1 style={{margin:0, fontSize:'1.5rem'}}>Create Interview</h1>
            <p style={{fontSize:'0.7rem', color:'var(--foreground-soft)', marginTop:6}}>Provide a name and JSON structure (title + sections array).</p>
          </div>
          <input placeholder='Interview name' value={name} onChange={e=>setName(e.target.value)} />
          <textarea rows={14} value={json} onChange={e=>setJson(e.target.value)} style={{fontFamily:'var(--font-mono)', fontSize:'0.65rem'}} />
          {error && <div style={{fontSize:'0.65rem', color:'var(--danger)'}}>{error}</div>}
          <div style={{display:'flex', gap:8}}>
            <button className='btn' disabled={!name || creating} onClick={create}>{creating? 'Creating...' : 'Create'}</button>
            <button type='button' className='btn-outline' onClick={()=>{ try { setJson(JSON.stringify(JSON.parse(json), null, 2)); } catch{} }}>Format JSON</button>
            <button type='button' className='btn-outline' onClick={()=>router.back()}>Cancel</button>
          </div>
        </div>
      </div>
    </main>
  )
}
// TopBar removed – provided by shared dashboard layout
