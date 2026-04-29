// src/components/annotators/AudioTranscriptionRenderer.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { AudioTranscriptionConfig, AudioTranscriptionResult, AudioTaskData } from "@/types";

interface Props {
  data: AudioTaskData;
  config: AudioTranscriptionConfig;
  result: AudioTranscriptionResult | null;
  onChange: (r: AudioTranscriptionResult) => void;
}

export function AudioTranscriptionRenderer({ data, config, result, onChange }: Props) {
  const [transcript, setTranscript] = useState(result?.transcript ?? "");
  const [language, setLanguage] = useState(result?.language ?? (config.languages?.[0] ?? "English"));
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (result) {
      setTranscript(result.transcript ?? "");
      setLanguage(result.language ?? config.languages?.[0] ?? "English");
    }
  }, [result]);

  const handleTranscriptChange = (v: string) => {
    setTranscript(v);
    onChange({ transcript: v, language });
  };

  const handleLanguageChange = (v: string) => {
    setLanguage(v);
    onChange({ transcript, language: v });
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 fade-in">
      {config.instructions && (
        <div className="text-xs text-gray-500 bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-3">
          📋 {config.instructions}
        </div>
      )}

      {/* Audio info */}
      {data.description && (
        <div className="text-sm text-gray-400 font-medium">{data.description}</div>
      )}

      {/* Audio Player */}
      <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <audio
          ref={audioRef}
          src={data.audioUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          preload="metadata"
        />

        <div className="flex items-center gap-4">
          {/* Play/Pause button */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-colors flex-shrink-0"
          >
            {playing ? (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Waveform / Progress bar */}
          <div className="flex-1 space-y-1">
            <div
              className="h-2 bg-[#2a2d3e] rounded-full cursor-pointer overflow-hidden"
              onClick={seek}
            >
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Speed */}
          <select
            defaultValue="1"
            className="bg-[#0e0f14] border border-[#2a2d3e] text-xs text-gray-400 rounded px-2 py-1"
            onChange={(e) => { if (audioRef.current) audioRef.current.playbackRate = parseFloat(e.target.value); }}
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
          </select>
        </div>

        {/* Keyboard shortcut hint */}
        <p className="text-xs text-gray-700">
          Tip: Space bar plays/pauses · Adjust speed for faster review
        </p>
      </div>

      {/* Language selector */}
      {config.languages && config.languages.length > 1 && (
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">Language</label>
          <div className="flex flex-wrap gap-2">
            {config.languages.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  language === lang
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : "border-[#2a2d3e] bg-[#13151e] text-gray-500 hover:text-white"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transcription textarea */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
          Transcription
        </label>
        <textarea
          value={transcript}
          onChange={(e) => handleTranscriptChange(e.target.value)}
          placeholder="Type what you hear... Use [unclear] for inaudible sections."
          rows={6}
          className="w-full bg-[#13151e] border border-[#2a2d3e] focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder:text-gray-700 outline-none transition-colors resize-none font-mono"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-700">{transcript.length} characters</span>
          <span className="text-xs text-gray-700">{transcript.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </div>
    </div>
  );
}
