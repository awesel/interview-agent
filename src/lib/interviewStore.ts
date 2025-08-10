"use client";
import { create } from "zustand";
import { ScriptT, Session, Utterance } from "@/lib/types";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

type Store = {
  session?: Session;
  currentIdx: number;
  timeLeftSec: number;
  ticking: boolean;
  start: (script: ScriptT) => void;
  nudgeOrAdvance: () => void;
  addCandidate: (text: string) => void;
  addInterviewer: (text: string) => void;
  addUtterance: (u: Utterance) => void;
  tick: () => void;
  finish: () => void;
  setArtifacts: (artifacts: NonNullable<Session["artifacts"]>) => void;
  setParticipant: (participant: NonNullable<Session["participant"]>) => void;
};

export const useInterview = create<Store>((set, get) => ({
  currentIdx: 0,
  timeLeftSec: 0,
  ticking: false,

  start: (script) => {
    const now = Date.now();
    const session: Session = {
      id: crypto.randomUUID(),
      script,
      startedAt: now,
      sections: script.sections.map((s) => ({ id: s.id })),
      transcript: [],
    };
    set({
      session,
      currentIdx: 0,
      timeLeftSec: script.sections[0].targetDurationSec,
      ticking: true,
    });
    // Create/merge attempt document immediately so subsequent writes succeed
    void ensureAttemptCreated();
    // Open with the first prompt
    get().addInterviewer(script.sections[0].prompt);
  },

  addUtterance: (u) =>
    set((st) => ({
      session: st.session && {
        ...st.session,
        transcript: [...st.session.transcript, u],
      },
    })),

  addCandidate: async (text) => {
    const st = get();
    if (!st.session) return;
    const sec = st.session.script.sections[st.currentIdx];
    get().addUtterance({
      speaker: "candidate",
      text,
      atMs: Date.now(),
      sectionId: sec.id,
    });
    // Persist immediately
    void saveUtterance({
      speaker: "candidate",
      text,
      atMs: Date.now(),
      sectionId: sec.id,
    });

    // If <= 30s remain, skip follow-ups and move on
    if (get().timeLeftSec <= 30) {
      get().addInterviewer("⏱ Not enough time for follow-ups. Moving on.");
      get().nudgeOrAdvance();
      return;
    }

    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: sec.prompt, answer: text }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { followups?: string[] };
      const list = Array.isArray(data.followups) ? data.followups : [];
      if (list.length === 0) {
        // No follow-ups: do nothing; candidate can proceed or time will advance
        return;
      }
      // Ask first follow-up only to keep flow tight
      get().addInterviewer(list[0]);
    } catch {
      // Silent failure: keep interview flowing
    }
  },

  addInterviewer: (text) => {
    const st = get();
    if (!st.session) return;
    const sec = st.session.script.sections[st.currentIdx];
    const u: Utterance = {
      speaker: "interviewer",
      text,
      atMs: Date.now(),
      sectionId: sec.id,
    };
    get().addUtterance(u);
    // Persist immediately (fire-and-forget)
    void saveUtterance(u);
  },

  tick: () => {
    const st = get();
    if (!st.ticking) return;
    const next = st.timeLeftSec - 1;
    set({ timeLeftSec: next });
    if (next === 10) get().addInterviewer("👋 10 seconds left, please wrap this thought.");
    if (next <= 0) get().nudgeOrAdvance();
  },

  nudgeOrAdvance: () => {
    const st = get();
    if (!st.session) return;
    const nextIdx = st.currentIdx + 1;
    const last = st.session.script.sections[st.currentIdx];
    st.addInterviewer(`⏱ Moving on from "${last.id}".`);
    if (nextIdx < st.session.script.sections.length) {
      const next = st.session.script.sections[nextIdx];
      set({ currentIdx: nextIdx, timeLeftSec: next.targetDurationSec, ticking: true });
      st.addInterviewer(next.prompt);
    } else {
      get().finish();
    }
  },

  finish: () =>
    set((st) => ({
      ticking: false,
      session: st.session && { ...st.session, endedAt: Date.now() },
    })),

  setArtifacts: (artifacts) =>
    set((st) => ({
      session: st.session ? { ...st.session, artifacts } : st.session,
    })),
 
  setParticipant: (participant) =>
    set((st) => ({
      session: st.session ? { ...st.session, participant } : st.session,
    })),
}));

// ===============================
// Firestore persistence helpers
// ===============================

async function ensureAttemptCreated(): Promise<void> {
  const st = useInterview.getState();
  const session = st.session;
  if (!session) return;
  const attemptRef = doc(db, "attempts", session.id);
  const base = {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
    sections: session.sections,
    participantSnapshot: session.participant ?? null,
    scriptTitle: session.script.title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as const;
  try {
    await setDoc(attemptRef, base, { merge: true });
  } catch {
    // ignore
  }
}

async function saveUtterance(u: Utterance): Promise<void> {
  const st = useInterview.getState();
  const session = st.session;
  if (!session) return;
  const col = collection(db, "attempts", session.id, "transcript");
  try {
    await addDoc(col, {
      ...u,
      createdAt: serverTimestamp(),
    });
    // Update attempt updatedAt
    await updateDoc(doc(db, "attempts", session.id), { updatedAt: serverTimestamp() });
  } catch {
    // ignore
  }
}

// Keep attempt doc in sync for participant, artifacts, and end state
useInterview.subscribe((st, prev) => {
  const session = st.session;
  const prevSession = prev.session;
  if (!session) return;
  // Participant
  if (session.participant && session.participant !== prevSession?.participant) {
    void updateDoc(doc(db, "attempts", session.id), {
      participantSnapshot: session.participant,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }
  // Artifacts
  if (session.artifacts && session.artifacts !== prevSession?.artifacts) {
    void updateDoc(doc(db, "attempts", session.id), {
      artifacts: session.artifacts,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }
  // Ended
  if (session.endedAt && session.endedAt !== prevSession?.endedAt) {
    void updateDoc(doc(db, "attempts", session.id), {
      endedAt: session.endedAt,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }
});


