"use client";
import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { listInterviewers, deleteInterviewer as svcDelete, updateInterviewer as svcUpdate, InterviewerRecord } from "@/lib/interviewersService";
import Link from "next/link";

// Dashboard index = View All list only
export default function DashboardIndexPage(){
  const [list, setList] = useState<InterviewerRecord[]>([]);
  const [authReady,setAuthReady]=useState(false);
  const dragId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [user,setUser]=useState(()=>auth?.currentUser);
  // subscribe to auth changes for reliability
  useEffect(()=>{
    const unsub = auth?.onAuthStateChanged(u=>{ setUser(u); setAuthReady(true); }) || (() => {});
    return ()=>unsub();
  },[]);
  // polling loader (simple) – could be replaced with snapshot listener later
  useEffect(()=>{
    if(!user) return;
    let active=true;
    let timer: ReturnType<typeof setTimeout>;
    async function load(){
      if(!active) return;
      if(!user) return;
      const items = await listInterviewers(user.uid);
      setList(items.sort((a,b)=>a.order-b.order));
      timer = setTimeout(load, 6000); // slightly slower to reduce calls
    }
    load();
    return ()=>{ active=false; clearTimeout(timer); };
  },[user]);

  async function reorder(fromId:string, toId:string){
    if(fromId===toId) return;
    const current=[...list];
    const fromIdx=current.findIndex(d=>d.id===fromId); const toIdx=current.findIndex(d=>d.id===toId);
    if(fromIdx<0||toIdx<0) return;
    const [m]=current.splice(fromIdx,1); current.splice(toIdx,0,m);
    const reordered=current.map((d,i)=>({...d,order:i}));
    setList(reordered);
    await Promise.all(reordered.map((d,i)=>svcUpdate(d.id,{order:i})));
  }
  async function remove(id:string){
    if(!confirm('Delete this interviewer?')) return;
    await svcDelete(id);
    setList(l=>l.filter(x=>x.id!==id));
  }
  if(!authReady) return <div style={{padding:'2rem', fontSize:'0.7rem'}}>Loading account…</div>;
  if(!user) return <div style={{padding:'2rem', fontSize:'0.7rem'}}>Please <Link href="/signup/interviewer" style={{color:'var(--blue)'}}>sign in</Link> to manage interviews.</div>;
  return (
    <div style={{padding:'1.25rem 1.5rem', display:'grid', gap:'1.25rem'}}>
      <h1 style={{margin:0, fontSize:'1.15rem', fontWeight:700}}>All Interviews</h1>
      {list.length===0 && (
        <div className='card' style={{padding:'2rem', textAlign:'center', fontSize:'0.75rem'}}>No interviews yet. <Link href="/dashboard/create" style={{color:'var(--blue)', textDecoration:'none'}}>Create one</Link>.</div>
      )}
      <ul style={{display:'grid', gap:'0.9rem'}}>
        {list.map(iv=> (
          <li key={iv.id}
            onDragOver={(e)=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; }}
            onDrop={(e)=>{ e.preventDefault(); if(dragId.current) reorder(dragId.current, iv.id); }}
            onClick={(e)=>{ if((e.target as HTMLElement).closest('[data-drag-handle]')) return; if((e.target as HTMLElement).closest('button[data-action]')) return; if(!iv.slug) return; window.location.href=`/dashboard/${iv.slug}`; }}
            className='card' style={{position:'relative', padding:'0.85rem 0.9rem 0.9rem', display:'grid', gap:6, opacity: draggingId===iv.id? 0.4:1, transition:'opacity 120ms', cursor: iv.slug? 'pointer':'default'}}
            data-draggable-id={iv.id}
            role='button'
            tabIndex={0}
            onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); if(iv.slug) window.location.href=`/dashboard/${iv.slug}`; } }}
          >
            <div
              draggable
              onDragStart={e=>{ 
                dragId.current=iv.id; 
                setDraggingId(iv.id);
                e.dataTransfer.effectAllowed='move';
                const li = (e.currentTarget as HTMLElement).closest('li');
                if(li){
                  // Create a clone for drag image so whole card appears to move
                  const rect = li.getBoundingClientRect();
                  const clone = li.cloneNode(true) as HTMLElement;
                  clone.style.width = rect.width+"px";
                  clone.style.height = rect.height+"px";
                  clone.style.position='absolute';
                  clone.style.top='-9999px';
                  clone.style.left='-9999px';
                  clone.style.pointerEvents='none';
                  document.body.appendChild(clone);
                  e.dataTransfer.setDragImage(clone, 24, 20);
                  // remove after drag start tick
                  requestAnimationFrame(()=>{ try { document.body.removeChild(clone);} catch{} });
                }
              }}
              onDragEnd={e=>{ dragId.current=null; setDraggingId(null); }}
              style={{position:'absolute', left:6, top:6, cursor:'grab', fontSize:'0.7rem', opacity:0.7, padding:'4px'}}
              aria-label='Drag to reorder'
              title='Drag to reorder'
              data-drag-handle
            >≡</div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingLeft:20, gap:8}}>
              <h3 style={{fontSize:'0.9rem', fontWeight:600, margin:0}}>{iv.name}</h3>
              <button data-action='delete' className='btn-outline' style={{fontSize:'0.55rem', padding:'2px 6px'}} onClick={(e)=>{ e.stopPropagation(); remove(iv.id); }}>Delete</button>
            </div>
            <div style={{fontSize:'0.55rem', color:'var(--foreground-soft)', marginTop:4, paddingLeft:20}}>{iv.slug || '— no slug —'}</div>
            {iv.slug && (
              <div style={{marginTop:10, display:'flex', gap:6, flexWrap:'wrap', paddingLeft:20}}>
                <CopyField value={`${typeof window!=='undefined'?window.location.origin:''}/signup/candidate?next=/interview/${iv.slug}`} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatJson(s: string) {
  const obj = JSON.parse(s);
  return JSON.stringify(obj, null, 2);
}

function CopyField({ value }: { value: string }) {
  return (
    <div onClick={(e)=>e.stopPropagation()} style={{display:"flex", alignItems:"center", gap:4}}>
      <input onClick={(e)=>e.stopPropagation()} readOnly value={value} style={{fontSize:"0.6rem", padding:"4px 6px", width:220}} />
      <button
        type="button"
        data-action="copy"
        className="btn-outline"
        style={{fontSize:"0.65rem"}}
        onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(value); }}
      >
        Copy
      </button>
    </div>
  );
}

// Top bar moved to dashboard/layout.tsx

// Sidebar removed per new design (create & all views have no side panel, selected view focuses on content)

// Create screen moved to /dashboard/create

// All interviews list logic now inline in index page

// Active details moved to /dashboard/[slug]

// Sessions / Results moved

// Results moved

// Selected sidebar moved

// Footer & profile moved to layout


