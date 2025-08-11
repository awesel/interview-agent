"use client";
import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  messageId?: string;
  text?: string;
  autoPlay?: boolean;
  onPlayComplete?: () => void;
}

export default function AudioPlayer({ 
  messageId, 
  text, 
  autoPlay = false,
  onPlayComplete 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (messageId && autoPlay) {
      playAudio();
    }
  }, [messageId, autoPlay]);

  const playAudio = async () => {
    if (!messageId) return;

    try {
      setIsLoading(true);
      
      if (!audioRef.current) {
        const audio = new Audio(`/api/voice?messageId=${messageId}`);
        audioRef.current = audio;
        
        audio.addEventListener('loadedmetadata', () => {
          const audioDuration = audio.duration;
          if (audioDuration && !isNaN(audioDuration) && isFinite(audioDuration)) {
            setDuration(audioDuration);
          } else {
            console.warn('Invalid audio duration:', audioDuration);
            setDuration(0);
          }
        });
        
        audio.addEventListener('timeupdate', () => {
          const currentTime = audio.currentTime;
          if (!isNaN(currentTime) && isFinite(currentTime)) {
            setCurrentTime(currentTime);
          }
        });
        
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentTime(0);
          onPlayComplete?.();
        });
        
        audio.addEventListener('error', () => {
          console.error('Audio playback error');
          setIsLoading(false);
          setIsPlaying(false);
        });
      }

      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Audio playback failed:", error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || !isFinite(time)) {
      return "0:00";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!messageId) {
    return (
      <div className="text-sm text-gray-500 italic">
        {text || "No audio available"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <button
        onClick={isPlaying ? pauseAudio : playAudio}
        disabled={isLoading}
        className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      <div className="flex-1">
        <div className="text-sm text-gray-700 mb-1">{text}</div>
        
        {duration > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                style={{ 
                  width: duration > 0 && !isNaN(currentTime / duration) 
                    ? `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%` 
                    : '0%' 
                }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {isPlaying && (
        <button
          onClick={stopAudio}
          className="w-8 h-8 rounded-full bg-gray-400 hover:bg-gray-500 text-white flex items-center justify-center"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
        </button>
      )}
    </div>
  );
}