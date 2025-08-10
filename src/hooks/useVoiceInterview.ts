"use client";
import { useState, useEffect, useCallback } from "react";
import { useInterview } from "@/lib/interviewStore";

interface VoiceMessage {
  id: string;
  text: string;
  audio_url?: string;
  timestamp: string;
}

interface AudioMessage {
  text: string;
  messageId: string;
  audioUrl: string;
}

export function useVoiceInterview(isVoiceMode: boolean = false) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [audioMessages, setAudioMessages] = useState<Map<string, AudioMessage>>(new Map());
  const [lastProcessedMessage, setLastProcessedMessage] = useState<string | null>(null);
  const interviewStore = useInterview();

  const initializeConversation = async () => {
    try {
      const response = await fetch("/api/voice?action=create-conversation", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }
      
      const data = await response.json();
      setConversationId(data.conversation_id);
    } catch (error) {
      console.error("Failed to initialize voice conversation:", error);
    }
  };

  const generateSpeech = useCallback(async (text: string): Promise<VoiceMessage | null> => {
    if (!conversationId) {
      console.warn("No conversation ID available");
      return null;
    }

    try {
      setIsGeneratingSpeech(true);
      
      const response = await fetch(`/api/voice?action=speak&conversationId=${conversationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const data = await response.json();
      return {
        id: data.message_id,
        text: data.text,
        audio_url: data.audio_url,
        timestamp: data.timestamp,
      };
    } catch (error) {
      console.error("Speech generation failed:", error);
      return null;
    } finally {
      setIsGeneratingSpeech(false);
    }
  }, [conversationId]);

  // Initialize conversation when interview starts
  useEffect(() => {
    if (interviewStore.session && !conversationId) {
      initializeConversation();
    }
  }, [interviewStore.session, conversationId]);

  // Monitor for new interviewer messages and generate TTS (only in voice mode)
  useEffect(() => {
    if (!conversationId || !interviewStore.session || !isVoiceMode) return;

    const transcript = interviewStore.session.transcript;
    const lastMessage = transcript[transcript.length - 1];
    
    if (
      lastMessage && 
      lastMessage.speaker === "interviewer" && 
      lastMessage.text !== lastProcessedMessage &&
      !isGeneratingSpeech
    ) {
      setLastProcessedMessage(lastMessage.text);
      generateSpeech(lastMessage.text).then((voiceMessage) => {
        if (voiceMessage) {
          const audioMessage: AudioMessage = {
            text: voiceMessage.text,
            messageId: voiceMessage.id,
            audioUrl: voiceMessage.audio_url || ""
          };
          setAudioMessages(prev => new Map(prev.set(lastMessage.text, audioMessage)));
        }
      });
    }
  }, [interviewStore.session?.transcript, conversationId, lastProcessedMessage, isGeneratingSpeech, generateSpeech, isVoiceMode]);

  const handleVoiceResponse = useCallback(async (text: string) => {
    // Add interviewer message to store immediately
    interviewStore.addInterviewer(text);
    
    // Speech generation will be handled automatically by the useEffect above
  }, [interviewStore]);

  const getAudioForText = useCallback((text: string) => {
    return audioMessages.get(text);
  }, [audioMessages]);

  // Enhanced addCandidate with voice integration
  const addCandidateWithVoice = useCallback(async (text: string) => {
    // Use the existing interview store logic
    await interviewStore.addCandidate(text);
    
    // The follow-up generation happens in the store, 
    // but we need to watch for new interviewer messages to generate speech
  }, [interviewStore]);

  return {
    conversationId,
    isGeneratingSpeech,
    audioMessages,
    generateSpeech,
    handleVoiceResponse,
    getAudioForText,
    addCandidateWithVoice,
  };
}