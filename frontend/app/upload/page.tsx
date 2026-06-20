"use client";

import React, { useState, useEffect, useRef } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        if (currentStatus === "pending_extraction" || currentStatus === "failed") {
          clearInterval(intervalId);
        }
      } catch (err: any) {
        console.error("Polling error:", err);
        setError("Error checking transcription status. Polling stopped.");
        clearInterval(intervalId);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [meetingId, API_BASE_URL]);

  // Drag handlers
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
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  // Click to select handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Submit file
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

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
      setStatus(data.status || "processing");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "An error occurred during upload.");
      setStatus("failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Status mapping
  const getStatusText = (statusVal: string) => {
    switch (statusVal) {
      case "uploading":
        return "Uploading file to server...";
      case "processing":
        return "Transcribing your meeting...";
      case "pending_extraction":
        return "Transcription complete — ready for analysis";
      case "failed":
        return "Transcription failed. Please try again.";
      default:
        return statusVal ? `Status: ${statusVal}` : "";
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 to-zinc-950 px-4 py-12 text-slate-100 font-sans">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Upload Meeting
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Upload your audio or video recording to transcribe and analyze the meeting.
          </p>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ${
              dragActive
                ? "border-violet-500 bg-violet-950/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                : "border-slate-700 bg-slate-950/20 hover:border-slate-600 hover:bg-slate-950/40"
            }`}
            onClick={onButtonClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="rounded-full bg-slate-800 p-4 ring-4 ring-slate-900/50">
                <svg
                  className="h-8 w-8 text-indigo-400 transition-transform duration-300 hover:scale-110"
                  fill="none"
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
                <p className="text-base font-medium text-slate-300">
                  Drag and drop your audio or video file here
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Or click to browse from your computer (MP3, WAV, M4A, MP4, etc.)
                </p>
              </div>
            </div>
          </div>

          {/* Selected File Details */}
          {file && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 transition-all duration-300 animate-fadeIn">
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
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setMeetingId(null);
                    setStatus("");
                    setError(null);
                  }}
                  className="rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                >
                  <svg
                    className="h-5 w-5"
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

          {/* Submit Button */}
          {file && !meetingId && !isUploading && (
            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/30 transition-all duration-300 hover:from-violet-500 hover:to-indigo-500 hover:shadow-indigo-900/50 focus:outline-hidden focus:ring-2 focus:ring-violet-500 active:scale-[0.98]"
            >
              Upload and Analyze
            </button>
          )}
        </form>

        {/* Status display */}
        {(isUploading || status) && (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <div className="flex items-center space-x-3">
              {(isUploading || status === "uploading" || status === "processing") ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent"></div>
              ) : status === "pending_extraction" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              ) : status === "failed" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full bg-slate-700"></div>
              )}

              <p className="text-sm font-medium text-slate-300">
                {getStatusText(status)}
              </p>
            </div>

            {/* Micro progress indicator */}
            {(isUploading || status === "uploading" || status === "processing") && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse w-2/3 rounded-full"></div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-6 rounded-lg border border-rose-950/50 bg-rose-950/20 p-4 text-sm text-rose-400">
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
