"use client";
import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, getAuth } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function CandidateSignup(){
  const auth = getAuth(app);
  const sp = useSearchParams();
  const [user,setUser]=useState<import('firebase/auth').User|null>(auth.currentUser);
  useEffect(()=> onAuthStateChanged(auth,u=>setUser(u)),[auth]);
  const nextPath = sp.get('next') || (typeof window!=='undefined' ? sessionStorage.getItem('candidate_next') || '' : '') || '/';

  async function signIn(){
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const u = res.user;
    await setDoc(doc(db,'users',u.uid), { uid:u.uid, email:u.email||'', displayName:u.displayName||'', roles:['candidate'], lastLoginAt:Date.now(), createdAt: Date.now(), provider:'google' }, {merge:true});
    const next = sp.get('next') || sessionStorage.getItem('candidate_next') || '/';
    window.location.href = next;
  }

  return (
    <main style={{minHeight:'100dvh', display:'grid', gridTemplateRows:'1fr auto', background:'radial-gradient(circle at 40% 30%, #f0f8ff, #dbeeff)'}}>
      <section style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'3rem 1.5rem', textAlign:'center', gap:'1.25rem'}}>
        <h1 style={{margin:0, fontSize:'2.6rem', fontWeight:700, background:'linear-gradient(90deg,#0d4d8f,#1381d6)', WebkitBackgroundClip:'text', color:'transparent'}}>Join Your Interview</h1>
        <p style={{margin:0, fontSize:'0.9rem', maxWidth:520, color:'#1c476d'}}>Sign in securely so we can attribute your answers and send follow‑up materials if needed.</p>
        {user ? (
          <div style={{display:'grid', gap:10, maxWidth:340, width:'100%'}}>
            <div style={{fontSize:'0.7rem'}}>Signed in as <strong>{user.displayName || user.email}</strong></div>
            <Link href={nextPath} className='btn' style={{textDecoration:'none'}} onClick={()=>{ try { sessionStorage.removeItem('candidate_next'); } catch{} }}>Continue to Interview</Link>
          </div>
        ) : (
          <button className='btn' onClick={signIn}>Continue with Google</button>
        )}
        <div style={{fontSize:'0.6rem', color:'#215781'}}>Recruiters: <Link href='/signup/interviewer' style={{color:'#0d4d8f'}}>Interviewer portal</Link></div>
      </section>
      <footer style={{padding:'1rem', fontSize:'0.55rem', textAlign:'center', color:'var(--foreground-soft)'}}>© {new Date().getFullYear()} OpenEar</footer>
    </main>
  );
}
