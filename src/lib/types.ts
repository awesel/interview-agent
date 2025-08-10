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
    phone: string;
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


