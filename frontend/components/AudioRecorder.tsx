"use client";

import React, { useState, useEffect, useRef } from "react";

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Use refs to store the recorder instance, stream, and timer interval to avoid state synchronization lag
  const recorderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer and stop microphone tracks on component unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const cleanupRecording = () => {
    // Clear timer interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Stop all audio tracks from the microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setAudioBlob(null);
      setDurationSeconds(0);

      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Dynamically import RecordRTC to prevent SSR issues in Next.js
      const RecordRTC = (await import("recordrtc")).default;

      // 3. Initialize the RecordRTC instance
      const recorder = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/webm",
      });

      // 4. Start recording and store instance
      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);

      // 5. Start the duration timer
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      alert("Could not access microphone. Please check permissions.");
      cleanupRecording();
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    try {
      // 1. Stop the RecordRTC instance
      recorder.stopRecording(() => {
        // 2. Retrieve the audio blob
        const blob = recorder.getBlob();
        setAudioBlob(blob);

        // 3. Convert blob into File
        const file = new File(
          [blob],
          `meeting-recording-${Date.now()}.webm`,
          { type: blob.type || "audio/webm" }
        );

        // 4. Call parent callback
        onRecordingComplete(file);

        // 5. Reset recording state and cleanup tracks/timers
        setIsRecording(false);
        cleanupRecording();
      });
    } catch (error) {
      console.error("Error stopping audio recording:", error);
      setIsRecording(false);
      cleanupRecording();
    }
  };

  // Helper to format duration in mm:ss format
  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    return `${formattedMinutes}:${formattedSeconds}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md max-w-sm w-full mx-auto transition-all duration-300">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-slate-200">Voice Recorder</h3>
        <p className="text-xs text-slate-500 mt-1">Record and upload audio directly</p>
      </div>

      {/* Recording Status and Timer */}
      <div className="flex flex-col items-center justify-center h-24 mb-6">
        {isRecording ? (
          <div className="flex flex-col items-center space-y-2 animate-fadeIn">
            <div className="flex items-center space-x-2 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
              <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-400 tracking-wider uppercase">Recording...</span>
            </div>
            <span className="text-3xl font-mono font-bold text-white tracking-wider">
              {formatDuration(durationSeconds)}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1">
            <span className="text-sm text-slate-400">Ready to Record</span>
            {audioBlob && (
              <span className="text-xs text-emerald-400 flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Recording captured successfully</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4 w-full">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-indigo-900/20 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span>Start Recording</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm text-white bg-rose-600 hover:bg-rose-500 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-rose-900/20 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            <span>Stop Recording</span>
          </button>
        )}
      </div>
    </div>
  );
}
