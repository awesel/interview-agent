import { db } from "./firebase";
import {
	collection,
	addDoc,
	doc,
	deleteDoc,
	updateDoc,
	getDocs,
	getDoc,
	query,
	where,
	orderBy,
	limit,
	Timestamp,
} from "firebase/firestore";

export type InterviewerRecord = {
	id: string;
	ownerUid: string;
	name: string;
	slug: string;
	script: any;
	createdAt: number;
	order: number;
};

const COL = "interviewers";
const SESS_COL = "sessions"; // candidate sessions per interviewer (deprecated)
const ATTEMPTS_COL = "attempt_results"; // new consolidated finished attempts

export async function listInterviewers(ownerUid: string): Promise<InterviewerRecord[]> {
	const q = query(collection(db, COL), where("ownerUid", "==", ownerUid), orderBy("order", "asc"));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function createInterviewer(data: Omit<InterviewerRecord, "id" | "createdAt" | "order" | "slug"> & { order?: number; slug?: string }) {
	const now = Date.now();
	const slug = data.slug || crypto.randomUUID();
	const ref = await addDoc(collection(db, COL), { ...data, slug, createdAt: now, order: data.order ?? now });
	return ref.id;
}

export async function deleteInterviewer(id: string) {
	await deleteDoc(doc(db, COL, id));
}

export async function updateInterviewer(id: string, patch: Partial<Pick<InterviewerRecord, "name" | "script" | "order">>) {
	await updateDoc(doc(db, COL, id), patch as any);
}

export async function getBySlug(slug: string): Promise<InterviewerRecord | null> {
	const q = query(collection(db, COL), where("slug", "==", slug), limit(1));
	const snap = await getDocs(q);
	if (snap.empty) return null;
	const d = snap.docs[0];
	return { id: d.id, ...(d.data() as any) };
}

// Candidate session storage (simplified) ----------------------------------
/**
 * Deprecated incremental session creation. Prefer createFinishedAttempt.
 */
export async function createSession(interviewerId: string, payload: any) {
	const ref = await addDoc(collection(db, SESS_COL), {
		interviewerId,
		createdAt: Date.now(),
		...payload,
	});
	return ref.id;
}

export type FinishedAttempt = {
	interviewerId: string;
	interviewerSlug?: string;
	scriptTitle: string;
	startedAt: number;
	endedAt: number;
	durationSec: number;
	participant?: { name?: string; email?: string; phone?: string } | null;
	transcript: any[]; // keep raw for now
	sections: any[];
	artifacts?: any;
	createdAt: number;
};

export async function createFinishedAttempt(data: FinishedAttempt) {
	const ref = await addDoc(collection(db, ATTEMPTS_COL), data);
	return ref.id;
}

export async function listSessions(interviewerId: string, limitN = 25) {
	const q = query(collection(db, SESS_COL), where("interviewerId", "==", interviewerId), orderBy("createdAt", "desc"), limit(limitN));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getSession(id: string) {
	const ref = doc(db, SESS_COL, id);
	const snap = await getDoc(ref);
	if (!snap.exists()) return null;
	return { id: snap.id, ...(snap.data() as any) };
}

// Utility
export function slugify(_s: string) {
	// For uniqueness & simplicity, prefer UUID; keep function name for backward compatibility
	return crypto.randomUUID();
}
