"use client";
import { create } from "zustand";
import { ScriptT, Session, Utterance } from "@/lib/types";

type Store = {
  session?: Session;
  currentIdx: number;
  timeLeftSec: number;
  ticking: boolean;
  // True when current section countdown has reached zero; we wait for next candidate answer to advance
  expired: boolean;
  start: (script: ScriptT) => void;
  nudgeOrAdvance: () => void;
  addCandidate: (text: string) => void;
  addInterviewer: (text: string) => void;
  addUtterance: (u: Utterance) => void;
  tick: () => void;
  finish: () => Promise<void>;
  setArtifacts: (artifacts: NonNullable<Session["artifacts"]>) => void;
  setParticipant: (participant: NonNullable<Session["participant"]>) => void;
};

export const useInterview = create<Store>((set, get) => ({
  currentIdx: 0,
  timeLeftSec: 0,
  ticking: false,
  expired: false,

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
  expired: false,
    });
  // Open with the first prompt (no remote writes until finish)
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
    const timeLeft = get().timeLeftSec;
    const expired = get().expired || timeLeft <= 0;

    // If section time fully expired: advance (or finish) after recording answer (no follow-ups)
    if (expired) {
      get().nudgeOrAdvance();
      return;
    }

    // If within final 30s window (but not expired), suppress follow-ups but stay on question
    if (timeLeft <= 30) {
      return; // Do not generate follow-ups, await further candidate input or expiration
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
  // (No-op remote persistence until finish)
  },

  tick: () => {
    const st = get();
    if (!st.ticking) return;
    const next = st.timeLeftSec - 1;
    if (next <= 0) {
      // Mark expired; stop ticking but wait for candidate answer to advance
      set({ timeLeftSec: 0, expired: true, ticking: false });
      return;
    }
    set({ timeLeftSec: next });
  },

  nudgeOrAdvance: () => {
    const st = get();
    if (!st.session) return;
    const nextIdx = st.currentIdx + 1;
    const last = st.session.script.sections[st.currentIdx];
    st.addInterviewer(`Moving on from "${last.id}".`);
    if (nextIdx < st.session.script.sections.length) {
      const next = st.session.script.sections[nextIdx];
      set({ currentIdx: nextIdx, timeLeftSec: next.targetDurationSec, ticking: true, expired: false });
      st.addInterviewer(next.prompt);
    } else {
      get().finish();
    }
  },

  finish: async () => {
    const cur = get().session;
    if (!cur) return;
    // Mark ended
    set({ ticking: false, expired: true, session: { ...cur, endedAt: Date.now() } });
    // Auto-summarize
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: cur.transcript }),
      });
      if (res.ok) {
        const data = await res.json();
        get().setArtifacts(data);
      }
    } catch {
      // swallow summarization errors to not disrupt UX
    }
  },

  setArtifacts: (artifacts) =>
    set((st) => ({
      session: st.session ? { ...st.session, artifacts } : st.session,
    })),
 
  setParticipant: (participant) =>
    set((st) => ({
      session: st.session ? { ...st.session, participant } : st.session,
    })),
}));

// All Firestore interaction removed; session persists only in-memory until finish,
// at which point /app/interview/[slug]/page.tsx will write a single consolidated record.


