"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AudioRecorder from "@/components/AudioRecorder";

export default function UploadPage() {
  const router = useRouter();
  // Shared Upload/Recording States
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording-Specific Sandbox States
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recorderKey, setRecorderKey] = useState<number>(0);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Polling logic when meetingId changes
  useEffect(() => {
    if (!meetingId) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch meeting status");
        }
        const data = await response.json();
        const currentStatus = data.status;
        setStatus(currentStatus);

        // Redirect immediately on pending_speaker_mapping
        if (currentStatus === "pending_speaker_mapping") {
          clearInterval(intervalId);
          router.push(`/meetings/${meetingId}/speakers`);
          return;
        }

        // Stop polling on terminal states
        if (
          currentStatus === "pending_review" ||
          currentStatus === "needs_review" ||
          currentStatus === "failed"
        ) {
          clearInterval(intervalId);
        }
      } catch (err: any) {
        console.error("Polling error:", err);
        setError("Error checking meeting status. Polling stopped.");
        clearInterval(intervalId);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [meetingId, API_BASE_URL, router]);

  // Clean up audio preview URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Shared function to handle meeting uploads
  const uploadMeeting = async (fileToUpload: File) => {
    if (isUploading) return;

    setIsUploading(true);
    setError(null);
    setStatus("uploading");
    setMeetingId(null);

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("source", "upload");

    try {
      const response = await fetch(`${API_BASE_URL}/meetings/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to upload file");
      }

      const data = await response.json();
      setMeetingId(data.id);
      const initialStatus = data.status || "processing";
      setStatus(initialStatus);
      if (initialStatus === "pending_speaker_mapping") {
        router.push(`/meetings/${data.id}/speakers`);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "An error occurred during upload.");
      setStatus("failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Drag handlers for File Upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Clear recording if a file is dragged in
      handleClearRecording();
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  // Click to browse file input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Clear recording if a file is selected
      handleClearRecording();
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const onBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Manual File Upload Submit Handler
  const handleFileUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      uploadMeeting(file);
    }
  };

  // Recording Complete Handler
  const handleRecordingComplete = (generatedFile: File) => {
    // Clear manual file selection when a recording completes
    setFile(null);
    setRecordedFile(generatedFile);
    setError(null);

    // Create a local URL for the preview player
    const url = URL.createObjectURL(generatedFile);
    setAudioUrl(url);
  };

  // Re-record / Clear Recording state
  const handleClearRecording = () => {
    setRecordedFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    // Increment the key to force AudioRecorder to unmount/remount (resets all internal states)
    setRecorderKey((prev) => prev + 1);
  };

  // Submit Recording Handler
  const handleRecordSubmit = () => {
    if (recordedFile) {
      uploadMeeting(recordedFile);
    }
  };

  // Human-readable status mapping
  const getStatusText = (statusVal: string) => {
    switch (statusVal) {
      case "uploading":
        return "Uploading file to server...";
      case "processing":
        return "Transcribing your meeting...";
      case "pending_speaker_mapping":
        return "Speaker mapping required...";
      case "extracting":
        return "Extracting meeting intelligence...";
      case "pending_extraction":
        return "Extracting meeting intelligence...";
      case "pending_review":
        return "Analysis complete";
      case "needs_review":
        return "Requires human review";
      case "failed":
        return "Processing failed";
      default:
        return statusVal ? `Status: ${statusVal}` : "";
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 to-zinc-950 px-4 py-12 text-slate-100 font-sans">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Meeting Intelligence
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Upload an existing meeting recording or capture one live using your microphone.
          </p>
        </div>

        {/* Layout grid containing Upload and Recording options */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-8 items-start">
          
          {/* Upload Left Column */}
          <div className="md:col-span-5 space-y-6">
            <h2 className="text-lg font-semibold text-slate-200 border-b border-slate-800 pb-2">
              Upload Existing Recording
            </h2>

            <form onSubmit={handleFileUploadSubmit} className="space-y-6">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onBrowseClick}
                className={`relative flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ${
                  dragActive
                    ? "border-violet-500 bg-violet-950/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                    : "border-slate-700 bg-slate-950/20 hover:border-slate-600 hover:bg-slate-950/40"
                } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />

                <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="rounded-full bg-slate-800 p-3 ring-4 ring-slate-900/50">
                    <svg
                      className="h-6 w-6 text-indigo-400 transition-transform duration-300 hover:scale-115"
                      fill="none;none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">
                      Drag & drop meeting file
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Or click to browse audio/video
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected File Metadata */}
              {file && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-cyan-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <div className="overflow-hidden">
                        <p className="truncate text-xs font-semibold text-slate-200">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-colors disabled:opacity-50"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Action Button */}
              {file && !isUploading && (
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/30 transition-all duration-300 hover:from-violet-500 hover:to-indigo-500 hover:shadow-indigo-900/50 active:scale-[0.98] disabled:opacity-50"
                >
                  Upload and Analyze File
                </button>
              )}
            </form>
          </div>

          {/* Divider Column */}
          <div className="md:col-span-1 flex md:flex-col items-center justify-center py-4 md:py-0 h-full">
            <div className="h-[1px] w-full md:w-[1px] md:h-48 bg-slate-800" />
            <span className="mx-4 md:my-4 text-xs font-semibold text-slate-600 tracking-wider">OR</span>
            <div className="h-[1px] w-full md:w-[1px] md:h-48 bg-slate-800" />
          </div>

          {/* Recording Right Column */}
          <div className="md:col-span-5 space-y-6">
            <h2 className="text-lg font-semibold text-slate-200 border-b border-slate-800 pb-2">
              Record New Meeting
            </h2>

            {/* AudioRecorder sandbox container */}
            <div className="space-y-6">
              <AudioRecorder key={recorderKey} onRecordingComplete={handleRecordingComplete} />

              {/* Output validation and Submit options */}
              {recordedFile && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4 animate-fadeIn">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recording Details</p>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-900">
                      <span className="text-slate-500">File size:</span>
                      <span className="font-mono text-slate-300">{(recordedFile.size / 1024).toFixed(2)} KB</span>
                    </div>
                  </div>

                  {audioUrl && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Preview Recording:</p>
                      <audio
                        src={audioUrl}
                        controls
                        className="w-full h-8 rounded-lg bg-slate-900 border border-slate-800"
                      />
                    </div>
                  )}

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={handleRecordSubmit}
                      className="flex-1 cursor-pointer rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                    >
                      Submit Recording
                    </button>
                    
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={handleClearRecording}
                      className="flex-1 cursor-pointer rounded-lg border border-slate-700 hover:border-slate-500 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                    >
                      Re-record
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Unified Status and Progress Section */}
        {(isUploading || status) && (
          <div className="mt-10 rounded-xl border border-slate-800 bg-slate-950/40 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isUploading || status === "uploading" || status === "processing" || status === "pending_extraction" ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                ) : status === "pending_review" ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : status === "needs_review" ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                ) : status === "failed" ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full bg-slate-700"></div>
                )}

                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {getStatusText(status)}
                  </p>
                  {meetingId && (
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Meeting ID: {meetingId}
                    </p>
                  )}
                </div>
              </div>

              {/* Reset page option when finished */}
              {(status === "pending_review" || status === "needs_review" || status === "failed") && (
                <button
                  onClick={() => {
                    setFile(null);
                    setMeetingId(null);
                    setStatus("");
                    setError(null);
                    handleClearRecording();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-all duration-200 cursor-pointer"
                >
                  Start New Session
                </button>
              )}
            </div>

            {/* Pulsing visual progress bar */}
            {(isUploading || status === "uploading" || status === "processing" || status === "pending_extraction") && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse w-3/4 rounded-full"></div>
              </div>
            )}

            {/* Final Outcome Notifications */}
            {status === "pending_review" && (
              <div className="mt-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3">
                ✓ <strong>Success:</strong> Meeting analysis successfully completed and saved. It is ready for review.
              </div>
            )}
            {status === "needs_review" && (
              <div className="mt-2 text-xs text-amber-400 bg-amber-950/20 border border-amber-900/30 rounded-lg p-3">
                ⚠ <strong>Attention Required:</strong> Meeting analysis is complete but flagged for manual human review due to low extraction confidence.
              </div>
            )}
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="mt-6 rounded-lg border border-rose-950/50 bg-rose-950/20 p-4 text-sm text-rose-400 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <svg
                className="h-5 w-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
