import { z } from "zod";

export const Section = z.object({
  id: z.string(),
  prompt: z.string(),
  targetDurationSec: z.number().int().positive(),
});

export const Script = z.object({
  title: z.string(),
  sections: z.array(Section).min(1),
});

export type SectionT = z.infer<typeof Section>;
export type ScriptT = z.infer<typeof Script>;

export type Utterance = {
  speaker: "interviewer" | "candidate";
  text: string;
  atMs: number;
  sectionId: string;
};

export type Session = {
  id: string;
  script: ScriptT;
  startedAt: number;
  endedAt?: number;
  participant?: {
    name: string;
    email: string;
  };
  sections: Array<{
    id: string;
    startedAt?: number;
    endedAt?: number;
    overrunSec?: number;
  }>;
  transcript: Utterance[];
  artifacts?: {
    summary?: string;
    insights?: string[];
    scores?: Array<{ sectionId: string; score: number; evidence: string[] }>; 
    quotes?: string[];
  };
};


// ===============================
// Firestore document shapes
// ===============================

export type DbUser = {
  uid: string; // Document ID must equal this uid
  email: string;
  displayName: string;
  photoURL?: string;
  provider: "google";
  createdAt: number; // Firestore Timestamp.toMillis()
  lastLoginAt: number; // Firestore Timestamp.toMillis()
  roles?: Array<"admin" | "interviewer" | "candidate">;
  interviewsCreatedCount?: number;
  interviewsTakenCount?: number;
};

export type DbInterview = {
  id: string; // Document ID; short, unique slug used in URLs
  ownerUid: string; // Creator uid
  title: string;
  script: ScriptT; // Embedded script for immutability per version
  visibility: "private" | "unlisted" | "public";
  status: "draft" | "active" | "archived";
  createdAt: number;
  updatedAt: number;
  respondentCount?: number;
  settings?: {
    maxDurationSec?: number;
    followupsEnabled?: boolean;
  };
};

export type DbAttempt = {
  id: string; // Attempt/session id
  interviewId: string;
  ownerUid: string; // Redundant owner uid for efficient queries
  candidateUid: string; // Signed-in user taking the interview
  participantSnapshot: {
    name?: string;
    email?: string;
    photoURL?: string;
  };
  startedAt: number;
  endedAt?: number;
  transcript: Utterance[];
  sections: Session["sections"]; // Progress timestamps
  artifacts?: Session["artifacts"]; // Summaries, insights, scores
};


