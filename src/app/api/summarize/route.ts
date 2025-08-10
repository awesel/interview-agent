import { NextRequest, NextResponse } from "next/server";

type Utterance = {
  speaker: "interviewer" | "candidate";
  text: string;
  atMs: number;
  sectionId: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const transcript: Utterance[] = Array.isArray(body?.transcript) ? body.transcript : [];
  const bySection = new Map<string, { words: number; quotes: string[] }>();
  for (const u of transcript) {
    const words = u.text.trim().split(/\s+/).filter(Boolean).length;
    const cur = bySection.get(u.sectionId) ?? { words: 0, quotes: [] };
    if (u.speaker === "candidate") {
      cur.words += words;
      if (u.text.length > 0) cur.quotes.push(u.text);
    }
    bySection.set(u.sectionId, cur);
  }

  const scores = Array.from(bySection.entries()).map(([sectionId, v]) => ({
    sectionId,
    score: Math.min(10, Math.round(v.words / 20)),
    evidence: v.quotes.slice(0, 2),
  }));

  const insights = [
    "Longer, structured answers tend to score higher in this mock.",
    "Quantify impact with metrics where possible.",
  ];

  const summary = `Mock summary: ${transcript.filter(t=>t.speaker==="candidate").length} candidate turns across ${bySection.size} sections.`;

  return NextResponse.json({ summary, insights, scores });
}


