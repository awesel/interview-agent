"use client";
import { useEffect, useState } from "react";

import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { app, db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { DbUser } from "@/lib/types";


export default function LoginPage() {
  const [user, setUser] = useState<null | { displayName: string | null; email: string | null }>(null);
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const auth = getAuth(app);
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({ displayName: u.displayName, email: u.email });
        // Upsert user in Firestore
        const data: DbUser = {
          uid: u.uid,
          email: u.email || "",
          displayName: u.displayName || "",
          photoURL: u.photoURL || undefined,
          provider: "google",
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };
        await setDoc(doc(db, "users", u.uid), data, { merge: true });
        const next = sp.get("next") || "/dashboard";
        router.replace(next);
      } else {
        setUser(null);
      }
    });
    return () => unsub();
  }, [router, sp]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <main style={{display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:"100dvh"}}>
      <div className="pixel-border" style={{position:"relative", overflow:"hidden"}}>
        <div style={{position:"absolute", inset:0, background:"radial-gradient(circle at 30% 40%, #bfe2ff, #7ec4ff)", filter:"contrast(110%) brightness(104%)"}} />
        <div style={{position:"absolute", inset:0, backgroundImage:"linear-gradient(45deg,#ffffff22 0%,transparent 60%), repeating-linear-gradient(90deg,#ffffff08 0 2px,transparent 2px 4px)", mixBlendMode:"overlay"}} />
        <div style={{position:"relative", padding:"3rem 2.5rem", color:"#0f2f4d", maxWidth:520}}>
          <h1 style={{fontSize:"3.1rem", lineHeight:1.05, fontWeight:700, textShadow:"0 2px 6px #ffffff66"}}>Build playful AI interviewers.</h1>
          <p style={{marginTop:"1.25rem", fontSize:"1.05rem", fontWeight:500, color:"#083255"}}>Generate adaptive follow‑ups, collect responses, and explore insights.</p>
          <ul style={{marginTop:"1.5rem", fontSize:"0.8rem", listStyle:"none", padding:0, display:"grid", gap:"0.4rem", color:"#0f375d"}}>
            <li>Quick setup</li>
            <li>Smart follow-up generation</li>
            <li>Result summaries</li>
          </ul>
        </div>
        <PixelArtDeco />
      </div>
      <div style={{display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem 2rem 3rem"}}>
        <div className="card" style={{width:"100%", maxWidth:420, position:"relative"}}>
          <h2 style={{fontSize:"1.9rem", fontWeight:600, lineHeight:1.1, marginBottom:"1rem"}}>Welcome</h2>
          <p style={{fontSize:"0.85rem", color:"var(--foreground-soft)", marginBottom:"1.25rem"}}>Sign in to create & share your first AI interviewer.</p>
          {user ? (
            <div style={{display:"grid", gap:"0.75rem"}}>
              <div style={{fontSize:"0.85rem"}}>Signed in as <strong>{user.displayName ?? user.email}</strong></div>
              <button className="btn-outline" onClick={handleSignOut}>Sign out</button>
            </div>
          ) : (
            <button className="btn" style={{width:"100%"}} onClick={handleSignIn}>Continue with Google</button>
          )}
        </div>
      </div>
    </main>
  );
}

function PixelArtDeco() {
  const squares = Array.from({length: 40});
  return (
    <div style={{position:"absolute", inset:0, pointerEvents:"none"}}>
      <div style={{position:"absolute", bottom:40, right:40, display:"grid", gridTemplateColumns:"repeat(8,14px)", gap:4}}>
        {squares.map((_,i)=>(
          <div key={i} style={{width:14,height:14, background:i%7===0?"#ffffffaa":"#ffffff33", border:"1px solid #ffffff55", borderRadius:3, backdropFilter:"blur(2px)"}} />
        ))}
      </div>
    </div>
  );
}


