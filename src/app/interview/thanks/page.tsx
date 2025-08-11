"use client";
import { useEffect } from "react";
import { useInterview } from "@/lib/interviewStore";

export default function ThanksPage() {
  const st = useInterview();

  return (
    <main className="max-w-2xl mx-auto p-8 text-center">
      <div className="space-y-6">
        <div className="text-6xl mb-4">🎉</div>
        
        <h1 className="text-3xl font-bold text-green-600">
          Interview Complete!
        </h1>
        
        <p className="text-lg text-gray-600">
          Thank you for completing the interview. Your responses have been recorded successfully.
        </p>
        
        {st.session && (
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <h3 className="font-semibold mb-2">Interview Summary:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Interview:</strong> {st.session.script.title}</p>
              <p><strong>Sections Completed:</strong> {st.session.script.sections.length}</p>
              <p><strong>Total Responses:</strong> {st.session.transcript.filter(u => u.speaker === "candidate").length}</p>
              {st.session.endedAt && st.session.startedAt && (
                <p><strong>Duration:</strong> {Math.round((st.session.endedAt - st.session.startedAt) / 60000)} minutes</p>
              )}
            </div>
          </div>
        )}
        
        <div className="pt-4">
          <p className="text-sm text-gray-500">
            You can now close this window or navigate back to the main application.
          </p>
        </div>
      </div>
    </main>
  );
}