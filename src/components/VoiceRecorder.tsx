"use client";
import { useState, useRef, useEffect } from "react";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  conversationId?: string;
  disabled?: boolean;
}

export default function VoiceRecorder({ 
  onTranscription, 
  conversationId,
  disabled = false 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" });
        stream.getTracks().forEach(track => track.stop());
        
        if (conversationId) {
          await transcribeAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    if (!conversationId) {
      setIsProcessing(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");

      const response = await fetch(`/api/voice?action=transcribe&conversationId=${conversationId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      if (data.text) {
        onTranscription(data.text);
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert("Transcription failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={`
          relative w-12 h-12 rounded-full flex items-center justify-center
          transition-all duration-200 
          ${isRecording 
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
            : "bg-blue-500 hover:bg-blue-600 text-white"
          }
          ${(disabled || isProcessing) ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isRecording ? (
          <div className="w-4 h-4 bg-white rounded-sm" />
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 11a1 1 0 0 1 2 0v1a9 9 0 0 1-18 0v-1a1 1 0 0 1 2 0v1a7 7 0 0 1 14 0v-1z"/>
            <path d="M12 19v3m-4 0h8"/>
          </svg>
        )}
      </button>
      
      <div className="text-sm text-gray-600">
        {isProcessing ? "Processing..." : 
         isRecording ? "Recording... Click to stop" : 
         "Click to record"}
      </div>
    </div>
  );
}