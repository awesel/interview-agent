"use client";
import { useEffect, useState } from "react";
import { useInterview } from "@/lib/interviewStore";
import hello from "@/../scripts/hello.json";
import { Script } from "@/lib/types";

export default function InterviewPage() {
  const st = useInterview();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!st.session) st.start(Script.parse(hello));
    const id = setInterval(() => st.tick(), 1000);
    setReady(true);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!st.session) return null;
  const sec = st.session.script.sections[st.currentIdx];

  return (
    <main className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">{st.session.script.title}</h1>
        <div className="text-lg">Section: {sec.id}</div>
        <div className="text-5xl tabular-nums">{st.timeLeftSec}s</div>

        <div className="p-4 rounded-xl border">
          <div className="font-medium mb-2">Question</div>
          <p>{sec.prompt}</p>
        </div>

        <CandidateInput />

        <div className="flex gap-2">
          <button className="btn" onClick={() => st.nudgeOrAdvance()}>Force Next</button>
          <button className="btn" onClick={() => downloadJSON(st.session!)}>Export JSON</button>
          <button className="btn" onClick={() => summarize(st)}>Finish & Summarize</button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Transcript</h2>
        <div className="h-[70vh] overflow-auto border rounded-xl p-3 space-y-2">
          {st.session.transcript.map((u, i) => (
            <div key={i} className="text-sm">
              <span className="font-mono">{u.sectionId}</span>{" "}
              <b>{u.speaker === "candidate" ? "You" : "Agent"}:</b> {u.text}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function CandidateInput() {
  const st = useInterview();
  const [val, setVal] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!val) return; st.addCandidate(val); setVal(""); }}>
      <textarea value={val} onChange={(e) => setVal(e.target.value)} className="w-full p-3 border rounded-xl" rows={3} placeholder="Answer here..." />
      <div className="mt-2 flex justify-end">
        <button className="btn">Send</button>
      </div>
    </form>
  );
}

function downloadJSON(obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "interview-session.json"; a.click();
  URL.revokeObjectURL(url);
}

async function summarize(st: ReturnType<typeof useInterview>) {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: st.session?.transcript ?? [] }),
  });
  if (!res.ok) return;
  const data = await res.json();
  st.setArtifacts(data);
}


