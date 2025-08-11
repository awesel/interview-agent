"use client";
import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { createFinishedAttempt } from "@/lib/interviewersService";
import { useRouter } from "next/navigation";
import hello from "@/../scripts/hello.json";
import { Script, ScriptT } from "@/lib/types";
import ScriptedInterviewPage from "../ScriptedInterviewPage"; // reuse existing interactive component for now
import { useInterview } from "@/lib/interviewStore";

// This wrapper fetches the interviewer script by slug; falls back to demo script if missing
export default function SharedInterview({ params }: { params: Promise<{ slug: string }> }) {
  // unwrap promise-based params (Next.js 15+)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { slug } = React.use(params);
  const [script, setScript] = useState<ScriptT | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [interviewerId, setInterviewerId] = useState<string | null>(null);
  const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);
  const st = useInterview();
  const router = useRouter();
  const autoSavedRef = useRef(false);
  const [authChecked,setAuthChecked]=useState(true);

  // Optional auth observer: do not force redirect; allow viewing/interview without sign-in
  useEffect(()=>{
    const unsub = auth.onAuthStateChanged(_u=>{
      setAuthChecked(true);
    });
    return ()=>unsub();
  },[slug]);

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
        const dref = snap.docs[0];
        interface InterviewerData {
  script: unknown;
  slug: string;
}

const data = dref.data() as InterviewerData;
        const parsed = Script.parse(data.script);
        setScript(parsed);
        setInterviewerId(dref.id);
        setNotFound(false);
      } catch {
        // If auth not ready yet, avoid flipping to notFound; wait for authChecked
        setNotFound(true);
      }
    }
    if(!slug) return;
    load();
  }, [slug]);

  // Initialize store with fetched script (only once)
  useEffect(() => {
    if (script && !st.session) {
      st.start(script);
    }
  }, [script, st]);

  // Single save when finished
  useEffect(()=>{
    if(!interviewerId) return;
    const s = st.session;
    if(!s || !s.endedAt) return;
    if(autoSavedRef.current) return;
    autoSavedRef.current = true;
    (async ()=>{
      try {
        interface Attempt {
          interviewerId: string;
          interviewerSlug: string;
          scriptTitle: string;
          startedAt: number;
          endedAt: number;
          durationSec: number;
          participant: unknown | null;
          transcript: unknown[];
          sections: unknown[];
          artifacts: unknown | null;
          createdAt: number;
        }

        const attempt: Attempt = {
          interviewerId,
          interviewerSlug: slug,
          scriptTitle: s.script.title,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          durationSec: s.endedAt ? Math.max(0, Math.round((s.endedAt - s.startedAt)/1000)) : 0,
          participant: s.participant || null,
          transcript: s.transcript,
          sections: s.sections,
          artifacts: s.artifacts || null,
          createdAt: Date.now(),
        };
        const id = await createFinishedAttempt(attempt);
        setSavedAttemptId(id);
        setTimeout(()=>{ router.replace(`/interview/${slug}/thanks?session=${id}`); }, 600);
      } catch {
        // swallow error for now
      }
    })();
  },[st.session?.endedAt, interviewerId, st.session, slug, router]);

  // No auth gating; allow access without showing auth spinner
  if (!script) return <CenteredSpinner label="Loading interview" />;
  return (
    <div style={{display:'grid', gridTemplateRows:'64px 1fr 40px', minHeight:'100dvh'}}>
      <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1.25rem', background:'#ffffffdd', backdropFilter:'blur(8px)', borderBottom:'1px solid #d4e6f9'}}>
        <div style={{fontWeight:700, fontSize:'0.95rem'}}>{script.title}</div>
        <div style={{fontSize:'0.55rem', color:'#4c6c8f', display:'flex', gap:12, alignItems:'center'}}>
          {st.session?.endedAt && <span style={{color:'#1a7f37'}}>Saving…</span>}
          <span>Powered by OpenEar</span>
        </div>
      </header>
      <div style={{position:'relative'}}>
        {notFound && (
          <div style={{background:"#ffe9e9", border:"1px solid #ffc9c9", padding:"0.75rem 1rem", fontSize:"0.7rem", margin:"1rem", borderRadius:8}}>
            Interview not found. Showing demo script instead.
          </div>
        )}
        <ScriptedInterviewPage script={script} />
      </div>
      <footer style={{fontSize:'0.55rem', color:'#4c6c8f', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem', background:'#ffffffdd', borderTop:'1px solid #d4e6f9'}}>© {new Date().getFullYear()} OpenEar</footer>
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
