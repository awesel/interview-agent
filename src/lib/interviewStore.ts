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


