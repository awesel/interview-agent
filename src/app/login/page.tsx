"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Deprecated generic login: redirect to interviewer signup (preserve next param)
export default function LoginRedirect(){
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(()=>{
    const next = sp.get('next');
    router.replace(next? `/signup/interviewer?next=${encodeURIComponent(next)}` : '/signup/interviewer');
  },[router, sp]);
  return <div style={{padding:'2rem', fontSize:'0.7rem'}}>Redirecting…</div>;
}


