"use client";
import { create } from "zustand";
import { ScriptT, Session, Utterance } from "@/lib/types";

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

  addCandidate: (text) => {
    const st = get();
    if (!st.session) return;
    const sec = st.session.script.sections[st.currentIdx];
    get().addUtterance({
      speaker: "candidate",
      text,
      atMs: Date.now(),
      sectionId: sec.id,
    });

    // Simple rule-based follow-up
    const words = text.trim().split(/\s+/).filter(Boolean);
    const followups: string[] = [];
    if (words.length < 10) followups.push("Could you elaborate a bit more on that?");
    if (/[0-9]/.test(text)) followups.push("What led to those numbers? Any context or assumptions?");
    if (followups.length > 0) get().addInterviewer(followups[0]);
  },

  addInterviewer: (text) => {
    const st = get();
    if (!st.session) return;
    const sec = st.session.script.sections[st.currentIdx];
    get().addUtterance({
      speaker: "interviewer",
      text,
      atMs: Date.now(),
      sectionId: sec.id,
    });
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
}));


