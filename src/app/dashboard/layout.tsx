"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { listInterviewers, InterviewerRecord } from "@/lib/interviewersService";

// Shared dashboard layout: provides persistent navbar + auth/profile + interview switcher
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div style={{display:'flex', flexDirection:'column', minHeight:'100dvh'}}>
			<DashboardNav />
			<div style={{flex:1, minHeight:0, display:'flex', flexDirection:'column'}}>
				{children}
			</div>
		</div>
	);
}

function DashboardNav(){
	const pathname = usePathname();
	const isAll = pathname === "/dashboard";
	const isCreate = pathname.startsWith("/dashboard/create");
	const slugMatch = pathname.match(/\/dashboard\/([^\/]+)(?:$|\/)/);
	const activeSlug = !isAll && !isCreate ? slugMatch?.[1] : undefined;
	return (
		<nav style={{height:56, position:'sticky', top:0, zIndex:40, backdropFilter:'blur(8px)', background:'#ffffffee', borderBottom:'1px solid #d4e6f9', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem', gap:16}}>
			<div style={{display:'flex', alignItems:'center', gap:18}}>
				<Link href="/dashboard" style={{fontWeight:700, fontSize:'1rem', textDecoration:'none', color:'inherit'}}>OpenEar</Link>
				<NavLink href="/dashboard" label="Show All" active={isAll} />
				<NavLink href="/dashboard/create" label="Create +" active={isCreate} hide={isCreate} />
			</div>
			<div style={{display:'flex', alignItems:'center', gap:16}}>
				{activeSlug && <InterviewSwitcher activeSlug={activeSlug} />}
				<ProfilePill />
			</div>
		</nav>
	);
}

function NavLink({ href, label, active, hide }: { href:string; label:string; active?:boolean; hide?:boolean }){
	if(hide) return null; // don't show Create + while already on create page per requirements
	return (
		<Link href={href} style={{
			textDecoration:'none',
			fontSize:'0.65rem',
			padding:'4px 10px',
			borderRadius:8,
			border:'1px solid #bcdaf3',
			background: active ? '#fff' : '#eef7ff',
			fontWeight: active ? 600 : 500,
			color:'inherit'
		}}>{label}</Link>
	);
}

function InterviewSwitcher({ activeSlug }: { activeSlug:string }){
	const [list,setList]=useState<InterviewerRecord[]>([]);
	const [loading,setLoading]=useState(true);
	const router = useRouter();
	useEffect(()=>{ let cancelled=false; async function load(){ const user=auth.currentUser; if(!user){ setLoading(false); return;} try { const items= await listInterviewers(user.uid); if(!cancelled) setList(items);} finally { if(!cancelled) setLoading(false);} } load(); },[]);
	if(loading) return <div style={{fontSize:'0.55rem', color:'var(--foreground-soft)'}}>Loading…</div>;
	if(!list.length) return null;
	return (
		<select value={activeSlug} onChange={e=>router.push(`/dashboard/${e.target.value}`)} style={{fontSize:'0.6rem', padding:'4px 8px', borderRadius:8, border:'1px solid #bcdaf3', background:'#f4fbff'}}>
			{list.map(iv=> <option key={iv.id} value={iv.slug}>{iv.name.length>24? iv.name.slice(0,24)+'…': iv.name}</option>)}
		</select>
	);
}

function ProfilePill(){
	const user = auth.currentUser;
	const router = useRouter();
	const [open,setOpen]=useState(false);
	const ref = useRef<HTMLDivElement|null>(null);
	useEffect(()=>{
		function onDoc(e:MouseEvent){ if(open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
		function onKey(e:KeyboardEvent){ if(e.key==='Escape') setOpen(false); }
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return ()=>{ document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
	},[open]);
	if(!user) return null;
	const label = user.displayName || user.email || 'You';
	async function doLogout(){
		await signOut(auth);
		router.push('/signup/interviewer');
	}
	return (
		<div ref={ref} style={{position:'relative'}}>
			<button onClick={()=>setOpen(o=>!o)} aria-haspopup="menu" aria-expanded={open} style={{display:'flex', alignItems:'center', gap:6, background:'#eef7ff', padding:'4px 10px', border:'1px solid #bcdaf3', borderRadius:20, fontSize:'0.6rem', cursor:'pointer'}}>
				<span style={{display:'inline-flex', width:18, height:18, borderRadius:'50%', background:'#3294ff', color:'#fff', alignItems:'center', justifyContent:'center', fontSize:'0.55rem', fontWeight:600}}>{label.charAt(0).toUpperCase()}</span>
				<span style={{maxWidth:140, overflow:'hidden', textOverflow:'ellipsis'}}>{label}</span>
				<span style={{fontSize:'0.55rem', opacity:0.6}}>▾</span>
			</button>
			{open && (
				<div role="menu" style={{position:'absolute', right:0, top:'calc(100% + 6px)', background:'#fff', border:'1px solid #cbdff3', borderRadius:10, padding:'8px 10px', display:'grid', gap:8, minWidth:190, boxShadow:'0 4px 14px -2px rgba(0,0,0,0.1)'}}>
					<div style={{fontSize:'0.55rem', lineHeight:1.3, color:'#4c6c8f'}}>
						<div style={{fontWeight:600}}>Signed in as</div>
						<div style={{wordBreak:'break-all'}}>{user.email || label}</div>
					</div>
					<button onClick={doLogout} style={{textAlign:'left', background:'#f4fbff', border:'1px solid #bcdaf3', padding:'6px 10px', borderRadius:8, cursor:'pointer', fontSize:'0.6rem', fontWeight:600}}>Logout</button>
				</div>
			)}
		</div>
	);
}

