"use client";
import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, getAuth } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function InterviewerSignup() {
  const auth = getAuth(app!);
  const [user,setUser]=useState<import('firebase/auth').User|null>(auth.currentUser);
  useEffect(()=> onAuthStateChanged(auth,u=>setUser(u)),[auth]);

  async function signIn(){
    if (!db) return;
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const u = res.user;
    await setDoc(doc(db,'users',u.uid), { uid:u.uid, email:u.email||'', displayName:u.displayName||'', roles:['interviewer'], lastLoginAt:Date.now(), createdAt: Date.now(), provider:'google' }, {merge:true});
    window.location.href='/dashboard';
  }

  return (
    <main style={{minHeight:'100dvh', display:'grid', gridTemplateColumns:'minmax(0,1fr) 480px'}}>
      <section style={{padding:'3rem 3.5rem', display:'flex', flexDirection:'column', gap:'1.75rem', background:'linear-gradient(135deg,#0d2f55,#134b83)'}}>
        <h1 style={{margin:0, fontSize:'3.2rem', lineHeight:1.05, color:'#fff', fontWeight:700}}>Create AI Interview Workflows</h1>
        <p style={{margin:0, fontSize:'1.05rem', color:'#d6e9ff', maxWidth:680}}>Design structured interviews, generate adaptive follow‑ups, and review candidate analytics in one unified dashboard.</p>
        <ul style={{margin:0, padding:0, listStyle:'none', display:'grid', gap:10, fontSize:'0.85rem', color:'#c6e3ff'}}>
          <li>Unlimited draft interviewers</li>
          <li>Automatic follow-up suggestion</li>
          <li>Session transcript storage</li>
        </ul>
        <div style={{marginTop:'auto', fontSize:'0.6rem', color:'#6aa8e9'}}>You are signing up as an interviewer • Need to take an interview instead? <Link style={{color:'#fff'}} href="/signup/candidate">Candidate sign in</Link></div>
      </section>
      <aside style={{display:'flex', alignItems:'center', justifyContent:'center', padding:'2.5rem'}}>
        <div className='card' style={{width:'100%', maxWidth:380, display:'grid', gap:'1.25rem'}}>
          <h2 style={{margin:0, fontSize:'1.9rem'}}>Interviewer Portal</h2>
          <p style={{margin:0, fontSize:'0.8rem', color:'var(--foreground-soft)'}}>Manage and create interview agents.</p>
          {user ? (
            <div style={{display:'grid', gap:8}}>
              <div style={{fontSize:'0.7rem'}}>Signed in as <strong>{user.displayName || user.email}</strong></div>
              <Link className='btn' href='/dashboard' style={{textDecoration:'none'}}>Go to Dashboard</Link>
            </div>
          ) : (
            <button className='btn' onClick={signIn}>Continue with Google</button>
          )}
          <div style={{fontSize:'0.55rem', color:'var(--foreground-soft)'}}>By continuing you agree to basic data retention for transcripts.</div>
        </div>
      </aside>
    </main>
  );
}
