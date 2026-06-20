"use client";

import React, { useState } from "react";
import AudioRecorder from "@/components/AudioRecorder";

export default function TestRecorderPage() {
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 to-zinc-950 px-4 py-12 text-slate-100 font-sans">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Sandbox Environment
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            Test Audio Recorder
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Record audio with the component and play it back to verify functionality.
          </p>
        </div>

        {/* Audio Recorder Component */}
        <AudioRecorder onRecordingComplete={handleRecordingComplete} />

        {/* Output verification section */}
        {recordedFile && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Recorded File Details</h3>
            
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-500">File Name:</span>
                <span className="font-mono text-slate-300">{recordedFile.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-500">Mime Type:</span>
                <span className="font-mono text-slate-300">{recordedFile.type}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">File Size:</span>
                <span className="font-mono text-slate-300">{(recordedFile.size / 1024).toFixed(2)} KB</span>
              </div>
            </div>

            {audioUrl && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">Audio Preview:</p>
                <audio src={audioUrl} controls className="w-full h-10 rounded-lg bg-slate-900 border border-slate-800" />
              </div>
            )}

            <button
              onClick={handleClear}
              className="w-full mt-2 py-2.5 rounded-lg border border-slate-700 hover:border-rose-500/50 hover:bg-rose-950/10 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-all duration-200 cursor-pointer"
            >
              Reset Sandbox
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
