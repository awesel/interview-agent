"use client";

import { useEffect, useMemo, useState } from "react";
import { Script, ScriptT } from "@/lib/types";

type SectionDraft = {
  prompt: string;
  targetDurationSec: number;
};

function slugifyId(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-");
  return base || "question";
}

function toScript(title: string, drafts: SectionDraft[]): ScriptT {
  const sections = drafts.map((d, idx) => ({
    id: `${slugifyId(d.prompt)}-${idx + 1}`,
    prompt: d.prompt,
    targetDurationSec: Math.max(1, Math.floor(Number(d.targetDurationSec) || 0)),
  }));
  return Script.parse({ title: title || "Untitled Interview", sections });
}

export default function ScriptForm({
  value,
  onChange,
  externalTitle,
}: {
  value?: ScriptT;
  onChange: (s: ScriptT) => void;
  externalTitle?: string; // interview name; used as script.title unless overridden in Advanced
}) {
  const [rows, setRows] = useState<SectionDraft[]>(
    value?.sections?.map((s) => ({ prompt: s.prompt, targetDurationSec: s.targetDurationSec })) || [
      { prompt: "", targetDurationSec: 60 },
    ]
  );

  // Always derive script.title from externalTitle (interview name)
  const computedTitle = externalTitle || "";
  const script = useMemo(() => toScript(computedTitle, rows), [computedTitle, rows]);

  useEffect(() => {
    onChange(script);
  }, [script, onChange]);

  function addRow() {
    setRows((prev) => [...prev, { prompt: "", targetDurationSec: 60 }]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function updateRow<K extends keyof SectionDraft>(index: number, key: K, value: SectionDraft[K]) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  return (
    <div className="card" style={{ display: "grid", gap: "0.9rem" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>Questions</div>
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row, i) => (
            <div key={i} className="card" style={{ padding: 12, display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: "0.6rem", fontWeight: 600 }}>Question</label>
                <input
                  placeholder={`Enter question ${i + 1}`}
                  value={row.prompt}
                  onChange={(e) => updateRow(i, "prompt", e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "grid", gap: 6, flex: "0 0 160px" }}>
                  <label style={{ fontSize: "0.6rem", fontWeight: 600 }}>Time (sec)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="60"
                    value={row.targetDurationSec}
                    onChange={(e) => updateRow(i, "targetDurationSec", Number(e.target.value))}
                  />
                </div>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => removeRow(i)}
                  disabled={rows.length <= 1}
                  title={rows.length <= 1 ? "At least one question is required" : "Remove question"}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <button type="button" className="btn" onClick={addRow}>
            + Add question
          </button>
        </div>
      </div>

      <details>
        <summary style={{ cursor: "pointer", fontSize: "0.75rem", color: "var(--foreground-soft)" }}>
          Preview JSON
        </summary>
        <pre
          style={{
            maxHeight: 280,
            overflow: "auto",
            fontSize: "0.6rem",
            background: "#f7fbff",
            border: "1px solid #d4e6f9",
            padding: "10px 12px",
            borderRadius: 10,
            marginTop: 8,
          }}
        >
          {JSON.stringify(script, null, 2)}
        </pre>
      </details>
    </div>
  );
}


