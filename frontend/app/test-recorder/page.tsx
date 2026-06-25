"use client";

import React, { useState } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import { useTheme } from "@/components/ThemeContext";

export default function TestRecorderPage() {
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const handleRecordingComplete = (file: File) => {
    console.log("Recording completed:", file);
    setRecordedFile(file);

    // Create a local URL for the captured file so we can play it back
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const handleClear = () => {
    setRecordedFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground font-sans transition-colors duration-150">
      
      {/* Floating Theme Toggle for Sandbox */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-lg border border-card-border text-muted-text hover:text-foreground bg-card-bg hover:bg-border-subtle transition-all cursor-pointer shadow-sm"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          )}
        </button>
      </div>

      <div className="w-full max-w-lg rounded-2xl border border-card-border bg-card-bg p-8 shadow-md space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider bg-accent-secondary text-accent-primary px-3 py-1 rounded-full border border-accent-primary/20">
            Sandbox Environment
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
            Test Audio Recorder
          </h1>
          <p className="mt-2 text-sm text-muted-text">
            Record audio with the component and play it back to verify functionality.
          </p>
        </div>

        {/* Audio Recorder Component */}
        <AudioRecorder onRecordingComplete={handleRecordingComplete} />

        {/* Output verification section */}
        {recordedFile && (
          <div className="rounded-xl border border-card-border bg-background p-6 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Recorded File Details</h3>
            
            <div className="space-y-2 text-xs text-muted-text">
              <div className="flex justify-between py-1.5 border-b border-card-border">
                <span className="text-muted-text">File Name:</span>
                <span className="font-mono text-foreground font-semibold">{recordedFile.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-card-border">
                <span className="text-muted-text">Mime Type:</span>
                <span className="font-mono text-foreground font-semibold">{recordedFile.type}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-text">File Size:</span>
                <span className="font-mono text-foreground font-semibold">{(recordedFile.size / 1024).toFixed(2)} KB</span>
              </div>
            </div>

            {audioUrl && (
              <div className="pt-4 border-t border-card-border space-y-3">
                <p className="text-xs text-muted-text">Audio Preview:</p>
                <audio src={audioUrl} controls className="w-full h-10 rounded-lg bg-background border border-card-border" />
              </div>
            )}

            <button
              onClick={handleClear}
              className="w-full mt-2 py-2.5 rounded-lg border border-card-border hover:border-rose-500/50 hover:bg-rose-500/5 text-xs font-bold text-muted-text hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200 cursor-pointer"
            >
              Reset Sandbox
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
