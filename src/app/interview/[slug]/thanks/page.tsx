"use client";
import React from "react";

import { useSearchParams } from "next/navigation";

export default function InterviewThanks({ params }: { params: Promise<{ slug: string }> }) {
  // unwrap promise params
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { slug } = React.use(params);
  const qp = useSearchParams();
  const session = qp.get('session');
  return (
    <main style={{minHeight:'100dvh', display:'grid', placeItems:'center', padding:'2rem'}}>
      <div className='card' style={{padding:'2rem 2.5rem', maxWidth:560, display:'grid', gap:'1.2rem', textAlign:'center'}}>
        <h1 style={{margin:0, fontSize:'1.75rem'}}>Thank You</h1>
        <p style={{margin:0, fontSize:'0.8rem', lineHeight:1.5}}>We appreciate you taking the time to complete the interview. Your responses have been securely saved.</p>
        {session && <div style={{fontSize:'0.55rem', color:'var(--foreground-soft)'}}>Session ID: {session}</div>}
      </div>
    </main>
  );
}
