"use client";
import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import hello from "@/../scripts/hello.json";
import { Script, ScriptT } from "@/lib/types";
import ScriptedInterviewPage from "../ScriptedInterviewPage"; // reuse existing interactive component for now
import { useInterview } from "@/lib/interviewStore";

// This wrapper fetches the interviewer script by slug; falls back to demo script if missing
export default function SharedInterview({ params }: { params: Promise<{ slug: string }> }) {
  // unwrap promise params (Next.js 15+)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { slug } = React.use(params);
  const [script, setScript] = useState<ScriptT | null>(null);
  const [notFound, setNotFound] = useState(false);
  const st = useInterview();

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "interviewers"), where("slug", "==", slug), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
          setNotFound(true);
          setScript(Script.parse(hello));
          return;
        }
        const data: any = snap.docs[0].data();
        const parsed = Script.parse(data.script);
        setScript(parsed);
      } catch {
        setNotFound(true);
      }
    }
    load();
  }, [slug]);

  // Initialize store with fetched script (only once)
  useEffect(() => {
    if (script && !st.session) {
      st.start(script);
    }
  }, [script, st]);

  if (!script) return <CenteredSpinner label="Loading interview" />;
  return (
    <div style={{display:'grid', gridTemplateRows:'64px 1fr 40px', minHeight:'100dvh'}}>
      <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1.25rem', background:'#ffffffdd', backdropFilter:'blur(8px)', borderBottom:'1px solid #d4e6f9'}}>
        <div style={{fontWeight:700, fontSize:'0.95rem'}}>{script.title}</div>
        <div style={{fontSize:'0.6rem', color:'#4c6c8f'}}>Powered by AI Interview Agent</div>
      </header>
      <div style={{position:'relative'}}>
        {notFound && (
          <div style={{background:"#ffe9e9", border:"1px solid #ffc9c9", padding:"0.75rem 1rem", fontSize:"0.7rem", margin:"1rem", borderRadius:8}}>
            Interview not found. Showing demo script instead.
          </div>
        )}
        <ScriptedInterviewPage script={script} />
      </div>
      <footer style={{fontSize:'0.55rem', color:'#4c6c8f', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem', background:'#ffffffdd', borderTop:'1px solid #d4e6f9'}}>© {new Date().getFullYear()} Interview Agent</footer>
    </div>
  );
}

function CenteredSpinner({ label }: { label?: string }){
  return (
    <div style={{display:'grid', placeItems:'center', minHeight:'100dvh'}}>
      <div style={{display:'grid', gap:12, justifyItems:'center'}}>
        <div style={{width:56, height:56, border:'5px solid #c9e4f9', borderTopColor:'#3294ff', borderRadius:'50%', animation:'spin 0.9s linear infinite'}} />
        {label && <div style={{fontSize:'0.65rem', color:'var(--foreground-soft)'}}>{label}</div>}
      </div>
    </div>
  );
}
