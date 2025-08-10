"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useInterview } from "@/lib/interviewStore";
import hello from "@/../scripts/hello.json";
import { Script, ScriptT } from "@/lib/types";
import VoiceRecorder from "@/components/VoiceRecorder";
import AudioPlayer from "@/components/AudioPlayer";
import { useVoiceInterview } from "@/hooks/useVoiceInterview";

export default function InterviewPage({ script, interviewerId, manualSave }: { script?: ScriptT; interviewerId?: string; manualSave?: () => void | Promise<void> }) {
  const st = useInterview();
  const [ready, setReady] = useState(false);
  const [info, setInfo] = useState({ name: "", email: "", phone: "" });
  const [infoDone, setInfoDone] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const voice = useVoiceInterview(isVoiceMode);

  useEffect(() => {
    if (!st.session) {
      const sc = script ? script : Script.parse(hello);
      st.start(sc);
    }
    const id = setInterval(() => st.tick(), 1000);
    setReady(true);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill from signed-in user (candidate) once (must be before any conditional return)
  useEffect(()=>{
    const u = auth.currentUser;
    if(!u) return;
    setInfo(prev=>({
      name: prev.name || u.displayName || "",
      email: prev.email || u.email || "",
      phone: prev.phone || ""
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  // Auto-complete info step if we already have name + email from auth
  useEffect(()=>{
    if(!infoDone && info.name && info.email){
      st.setParticipant({ ...info });
      setInfoDone(true);
    }
  },[info, infoDone, st]);

  // If session not yet initialized, show lightweight placeholder
  if (!st.session) {
    return (
      <main className="max-w-xl mx-auto p-6 text-sm text-gray-500">
        Initializing interview…
      </main>
    );
  }

  if (!infoDone) {
    return (
      <main className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Candidate Info</h1>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!info.name || !info.email) return;
            st.setParticipant({ ...info });
            setInfoDone(true);
          }}
        >
          <input className="w-full border rounded-md p-2" placeholder="Full name" value={info.name} onChange={(e)=>setInfo(v=>({...v,name:e.target.value}))} required />
          <input className="w-full border rounded-md p-2" placeholder="Email" type="email" value={info.email} onChange={(e)=>setInfo(v=>({...v,email:e.target.value}))} required />
          <input className="w-full border rounded-md p-2" placeholder="Phone (optional)" value={info.phone} onChange={(e)=>setInfo(v=>({...v,phone:e.target.value}))} />
          <div className="flex justify-end"><button className="btn">Continue</button></div>
        </form>
      </main>
    );
  }
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

        <CandidateInput isVoiceMode={isVoiceMode} conversationId={voice.conversationId} />

        <div className="flex gap-2 flex-wrap">
          <button 
            className={`btn ${isVoiceMode ? 'bg-green-500 text-white' : ''}`}
            onClick={() => setIsVoiceMode(!isVoiceMode)}
          >
            {isVoiceMode ? '🎤 Voice Mode' : '📝 Text Mode'}
          </button>
          <button className="btn" onClick={() => st.nudgeOrAdvance()}>Force Next</button>
          <button className="btn" onClick={() => downloadJSON(st.session!)}>Export JSON</button>
          <button className="btn" onClick={() => summarize(st.session?.transcript ?? [], st.setArtifacts)}>Finish & Summarize</button>
          <button className="btn" onClick={() => { st.finish(); manualSave?.(); }}>Finish Interview</button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Transcript</h2>
        <div className="h-[70vh] overflow-auto border rounded-xl p-3 space-y-3">
          {st.session.transcript.map((u, i) => (
            <div key={i} className="text-sm">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs text-gray-500">{u.sectionId}</span>
                <div className="flex-1">
                  <b>{u.speaker === "candidate" ? "You" : "Agent"}:</b> {u.text}
                  {u.speaker === "interviewer" && isVoiceMode && (() => {
                    const audioMessage = voice.getAudioForText(u.text);
                    return audioMessage ? (
                      <div className="mt-2">
                        <AudioPlayer 
                          messageId={audioMessage.messageId} 
                          text={u.text}
                          autoPlay={true}
                        />
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function CandidateInput({ isVoiceMode, conversationId }: { isVoiceMode: boolean; conversationId?: string | null }) {
  const st = useInterview();
  const [val, setVal] = useState("");

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!val) return;
    st.addCandidate(val);
    setVal("");
  };

  const handleVoiceTranscription = (text: string) => {
    st.addCandidate(text);
  };

  if (isVoiceMode) {
    return (
      <div className="space-y-4">
        <div className="p-4 border rounded-xl bg-blue-50">
          <h3 className="font-medium mb-2">Voice Input</h3>
          <VoiceRecorder 
            onTranscription={handleVoiceTranscription}
            conversationId={conversationId || undefined}
            disabled={!conversationId}
          />
          {!conversationId && (
            <p className="text-sm text-gray-500 mt-2">Initializing voice conversation...</p>
          )}
        </div>
        
        {/* Fallback text input */}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600">Or use text input</summary>
          <form onSubmit={handleTextSubmit} className="mt-2">
            <textarea 
              value={val} 
              onChange={(e) => setVal(e.target.value)} 
              className="w-full p-3 border rounded-xl" 
              rows={2} 
              placeholder="Type your answer here..." 
            />
            <div className="mt-2 flex justify-end">
              <button className="btn">Send Text</button>
            </div>
          </form>
        </details>
      </div>
    );
  }

  return (
    <form onSubmit={handleTextSubmit}>
      <textarea 
        value={val} 
        onChange={(e) => setVal(e.target.value)} 
        className="w-full p-3 border rounded-xl" 
        rows={3} 
        placeholder="Answer here..." 
      />
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

async function summarize(transcript: unknown[], setArtifacts: (a: any) => void) {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) return;
  const data = await res.json();
  setArtifacts(data);
}
