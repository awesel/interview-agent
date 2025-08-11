import { db } from "./firebase";
import { ScriptT, Session } from "./types";
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
	script: ScriptT;
	createdAt: number;
	order: number;
};

const COL = "interviewers";
const SESS_COL = "sessions"; // candidate sessions per interviewer (deprecated)
const ATTEMPTS_COL = "attempt_results"; // new consolidated finished attempts

export async function listInterviewers(ownerUid: string): Promise<InterviewerRecord[]> {
	if (!db) throw new Error('Firestore not initialized');
	const q = query(collection(db, COL), where("ownerUid", "==", ownerUid), orderBy("order", "asc"));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InterviewerRecord));
}

export async function createInterviewer(data: Omit<InterviewerRecord, "id" | "createdAt" | "order" | "slug"> & { order?: number; slug?: string }) {
	if (!db) throw new Error('Firestore not initialized');
	const now = Date.now();
	const slug = data.slug || crypto.randomUUID();
	const ref = await addDoc(collection(db, COL), { ...data, slug, createdAt: now, order: data.order ?? now });
	return ref.id;
}

export async function deleteInterviewer(id: string) {
	if (!db) throw new Error('Firestore not initialized');
	await deleteDoc(doc(db, COL, id));
}

export async function updateInterviewer(id: string, patch: Partial<Pick<InterviewerRecord, "name" | "script" | "order">>) {
	if (!db) throw new Error('Firestore not initialized');
	await updateDoc(doc(db, COL, id), patch);
}

export async function getBySlug(slug: string): Promise<InterviewerRecord | null> {
    if (!db) throw new Error('Firestore not initialized');
    // Try lookup by `slug` field first (new records)
    const q = query(collection(db, COL), where("slug", "==", slug), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as InterviewerRecord;
    }
    // Fallback: support older records that used document ID as slug
    const ref = doc(db, COL, slug);
    const byId = await getDoc(ref);
    if (byId.exists()) {
        return { id: byId.id, ...byId.data() } as InterviewerRecord;
    }
    return null;
}

// Candidate session storage (simplified) ----------------------------------
/**
 * Deprecated incremental session creation. Prefer createFinishedAttempt.
 */
export async function createSession(interviewerId: string, payload: Omit<FinishedAttempt, 'interviewerId' | 'createdAt'>) {
	if (!db) throw new Error('Firestore not initialized');
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
  participant?: { name?: string; email?: string } | null;
	transcript: Session['transcript']; // Use Session type from types.ts
	sections: Session['sections'];
	artifacts?: Session['artifacts'];
	createdAt: number;
};

export async function createFinishedAttempt(data: FinishedAttempt) {
	if (!db) throw new Error('Firestore not initialized');
	const ref = await addDoc(collection(db, ATTEMPTS_COL), data);
	return ref.id;
}

export async function listSessions(interviewerId: string, limitN = 25) {
	if (!db) throw new Error('Firestore not initialized');
	const q = query(collection(db, SESS_COL), where("interviewerId", "==", interviewerId), orderBy("createdAt", "desc"), limit(limitN));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as FinishedAttempt));
}

// New API: list finished attempts from `attempt_results`
export async function listAttempts(interviewerId: string, limitN = 25) {
  if (!db) throw new Error('Firestore not initialized');
  try {
    const qOrdered = query(
      collection(db, ATTEMPTS_COL),
      where('interviewerId', '==', interviewerId),
      orderBy('createdAt', 'desc'),
      limit(limitN)
    );
    const snap = await getDocs(qOrdered);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as FinishedAttempt));
  } catch (err: unknown) {
    // Graceful fallback when composite index is missing
    const msg = String((err as Error)?.message || '');
    if ((err as { code?: string })?.code === 'failed-precondition' || /index/i.test(msg)) {
      const qFallback = query(
        collection(db, ATTEMPTS_COL),
        where('interviewerId', '==', interviewerId),
        limit(limitN)
      );
      const snap = await getDocs(qFallback);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as FinishedAttempt));
      // Client-side sort to mimic the intended order
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return items;
    }
    throw err;
  }
}

// Utility
export function slugify(_s: string) {
	// For uniqueness & simplicity, prefer UUID; keep function name for backward compatibility
	return crypto.randomUUID();
}
