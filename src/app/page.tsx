"use client";
import { useAuth } from "@/lib/useAuth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(()=>{
    if (!loading && !user) router.replace("/login");
    if (!loading && user) router.replace("/dashboard");
  },[user, loading, router]);
  return (
    <main style={{padding:"4rem 1.5rem", textAlign:"center"}}>
      <div className="card" style={{maxWidth:640, margin:"0 auto"}}>
        <h1 style={{fontSize:"2.3rem", fontWeight:700, marginBottom:"1rem"}}>AI Interviewer</h1>
        <p style={{fontSize:"0.95rem", color:"var(--foreground-soft)", marginBottom:"1.25rem"}}>Generating adaptive follow-ups & playful candidate experiences.</p>
        <div style={{display:"flex", gap:"0.75rem", justifyContent:"center"}}>
          <a className="btn" href="/login">Get Started</a>
          <a className="btn-outline" href="/interview">Try Demo</a>
        </div>
      </div>
    </main>
  );
}
