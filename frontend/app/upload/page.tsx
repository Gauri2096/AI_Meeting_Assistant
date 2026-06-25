"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AudioRecorder from "@/components/AudioRecorder";
import { getMeeting, uploadMeetingFile } from "@/lib/api/meetings";
import { useTheme } from "@/components/ThemeContext";

export default function UploadPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };
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

  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [speakerMappingMode, setSpeakerMappingMode] = useState<"manual" | "automatic">("manual");
  const [newAttendeeEmail, setNewAttendeeEmail] = useState("");

  const handleAddAttendee = () => {
    const trimmed = newAttendeeEmail.trim().toLowerCase();
    if (trimmed && !attendees.includes(trimmed) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setAttendees([...attendees, trimmed]);
      setNewAttendeeEmail("");
    }
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter((a) => a !== email));
  };

  // Sync title with files
  useEffect(() => {
    if (file && !title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }, [file, title]);

  useEffect(() => {
    if (recordedFile && !title) {
      setTitle(`Recording_${new Date().toISOString().slice(0, 10)}`);
    }
  }, [recordedFile, title]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Polling logic when meetingId changes
  useEffect(() => {
    if (!meetingId) return;

    const intervalId = setInterval(async () => {
      try {
        const data = await getMeeting(meetingId);
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
  }, [meetingId, router]);

  // Clean up audio preview URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Shared function to handle meeting uploads
  const uploadMeeting = async (fileToUpload: File, source: string) => {
    if (isUploading) return;

    setIsUploading(true);
    setError(null);
    setStatus("uploading");
    setMeetingId(null);

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("source", source);
    formData.append("title", title || fileToUpload.name);
    formData.append("attendees_json", JSON.stringify(attendees));
    formData.append("speaker_mapping_mode", speakerMappingMode);

    try {
      const data = await uploadMeetingFile(formData);

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
      uploadMeeting(file, "upload");
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
      uploadMeeting(recordedFile, "record");
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
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative transition-colors duration-150">
        {/* Navbar / Top Bar */}
        <header className="border-b border-card-border bg-card-bg sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm transition-colors duration-150 w-full animate-fadeIn">
          <div className="flex items-center space-x-6">
            <h1 className="text-lg font-extrabold text-accent-primary">
              MeetIntel
            </h1>

            {/* Navigation links */}
            <nav className="flex items-center space-x-4 border-l border-card-border pl-6">
              <Link
                href="/dashboard"
                className={`text-xs font-bold transition-all relative py-1 ${
                  pathname === "/dashboard"
                    ? "text-accent-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent-primary after:rounded-full"
                    : "text-muted-text hover:text-foreground"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className={`text-xs font-bold transition-all relative py-1 ${
                  pathname === "/upload"
                    ? "text-accent-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent-primary after:rounded-full"
                    : "text-muted-text hover:text-foreground"
                }`}
              >
                Upload
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-card-border text-muted-text hover:text-foreground bg-card-bg hover:bg-border-subtle transition-all cursor-pointer"
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

            {user && (
              <div className="hidden md:flex flex-col text-right text-[10px] text-muted-text pl-2 border-l border-card-border">
                <span className="font-bold text-foreground">{user.name}</span>
                <span>{user.email}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="cursor-pointer text-xs font-bold text-muted-text hover:text-rose-650 transition-colors border border-card-border bg-card-bg hover:bg-border-subtle px-2.5 py-1.5 rounded-lg shrink-0"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Upload Container Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-8 animate-fadeIn">
          <div className="w-full rounded-2xl border border-card-border bg-card-bg p-8 shadow-md">
            
            {/* Header */}
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Upload & Analyze Meeting
              </h2>
              <p className="mt-2 text-sm text-muted-text max-w-lg mx-auto leading-relaxed">
                Upload an existing audio/video recording or capture one live to automatically generate summaries, action items, decisions, and transcripts.
              </p>
            </div>

            {/* Metadata Settings Section */}
            <div className="mb-8 p-6 rounded-xl border border-card-border bg-background space-y-6">
              <h3 className="text-base font-bold text-foreground border-b border-card-border pb-2">
                Meeting Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted-text uppercase tracking-wider">
                    Meeting Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter meeting title..."
                    className="w-full rounded-lg bg-card-bg border border-card-border px-3 py-2 text-sm text-foreground placeholder-muted-text/50 focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all duration-200"
                  />
                </div>

                {/* Speaker Mapping Mode */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted-text uppercase tracking-wider">
                    Speaker Identification Mode
                  </label>
                  <div className="flex space-x-6 pt-2">
                    <label className="flex items-center space-x-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="speakerMappingMode"
                        value="manual"
                        checked={speakerMappingMode === "manual"}
                        onChange={() => setSpeakerMappingMode("manual")}
                        className="text-accent-primary focus:ring-accent-primary h-3.5 w-3.5"
                      />
                      <span>Manual Speaker Mapping</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="speakerMappingMode"
                        value="automatic"
                        checked={speakerMappingMode === "automatic"}
                        onChange={() => setSpeakerMappingMode("automatic")}
                        className="text-accent-primary focus:ring-accent-primary h-3.5 w-3.5"
                      />
                      <span>Automatic</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Attendees List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-muted-text uppercase tracking-wider">
                  Attendees (Emails)
                </label>
                <div className="flex space-x-2 max-w-md">
                  <input
                    type="email"
                    value={newAttendeeEmail}
                    onChange={(e) => setNewAttendeeEmail(e.target.value)}
                    placeholder="e.g. attendee@company.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAttendee();
                      }
                    }}
                    className="flex-1 rounded-lg bg-card-bg border border-card-border px-3 py-1.5 text-xs text-foreground placeholder-muted-text/50 focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttendee}
                    className="px-4 py-1.5 rounded-lg bg-accent-primary hover:opacity-90 text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
                  >
                    Add Attendee
                  </button>
                </div>
                
                {attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {attendees.map((email, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent-secondary text-accent-primary border border-accent-primary/10"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(email)}
                          className="hover:text-rose-650 transition-colors cursor-pointer text-sm font-bold"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Layout grid containing Upload and Recording options */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-8 items-start">
              
              {/* Upload Left Column */}
              <div className="md:col-span-5 space-y-6">
                <h3 className="text-base font-bold text-foreground border-b border-card-border pb-2">
                  Upload Existing Recording
                </h3>

                <form onSubmit={handleFileUploadSubmit} className="space-y-6">
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={onBrowseClick}
                    className={`relative flex h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ${
                      dragActive
                        ? "border-accent-primary bg-accent-secondary/50 shadow-md"
                        : "border-card-border bg-background hover:border-slate-400 dark:hover:border-slate-700"
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
                      <div className="rounded-full bg-accent-secondary p-3 ring-4 ring-card-border/50 text-accent-primary">
                        <svg
                          className="h-6 w-6 transition-transform duration-300 hover:scale-110"
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
                        <p className="text-sm font-bold text-foreground">
                          Drag & drop meeting file
                        </p>
                        <p className="mt-1 text-xs text-muted-text">
                          Or click to browse audio/video
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Selected File Metadata */}
                  {file && (
                    <div className="rounded-lg border border-card-border bg-background p-4 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <svg
                            className="h-5 w-5 flex-shrink-0 text-accent-primary"
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
                            <p className="truncate text-xs font-semibold text-foreground">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-text">
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
                          className="rounded-full p-1 text-muted-text hover:bg-border-subtle hover:text-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
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
                      className="w-full cursor-pointer rounded-xl bg-accent-primary py-3 text-sm font-bold text-white shadow-md hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      Upload and Analyze File
                    </button>
                  )}
                </form>
              </div>

              {/* Divider Column */}
              <div className="md:col-span-1 flex md:flex-col items-center justify-center py-4 md:py-0 h-full">
                <div className="h-[1px] w-full md:w-[1px] md:h-48 bg-card-border" />
                <span className="mx-4 md:my-4 text-xs font-bold text-muted-text tracking-wider">OR</span>
                <div className="h-[1px] w-full md:w-[1px] md:h-48 bg-card-border" />
              </div>

              {/* Recording Right Column */}
              <div className="md:col-span-5 space-y-6">
                <h3 className="text-base font-bold text-foreground border-b border-card-border pb-2">
                  Record New Meeting
                </h3>

                {/* AudioRecorder sandbox container */}
                <div className="space-y-6">
                  <AudioRecorder key={recorderKey} onRecordingComplete={handleRecordingComplete} />

                  {/* Output validation and Submit options */}
                  {recordedFile && (
                    <div className="rounded-xl border border-card-border bg-background p-5 space-y-4 animate-fadeIn">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-text uppercase tracking-wider">Recording Details</p>
                        <div className="flex justify-between text-xs py-1.5 border-b border-card-border">
                          <span className="text-muted-text">File size:</span>
                          <span className="font-mono text-foreground font-semibold">{(recordedFile.size / 1024).toFixed(2)} KB</span>
                        </div>
                      </div>

                      {audioUrl && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-text">Preview Recording:</p>
                          <audio
                            src={audioUrl}
                            controls
                            className="w-full h-8 rounded-lg bg-card-bg border border-card-border"
                          />
                        </div>
                      )}

                      <div className="flex space-x-3 pt-2">
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={handleRecordSubmit}
                          className="flex-1 cursor-pointer rounded-lg bg-accent-primary py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                        >
                          Submit Recording
                        </button>
                        
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={handleClearRecording}
                          className="flex-1 cursor-pointer rounded-lg border border-card-border hover:border-slate-400 dark:hover:border-slate-700 bg-card-bg py-2.5 text-xs font-bold text-muted-text hover:text-foreground transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
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
              <div className="mt-10 rounded-xl border border-card-border bg-background p-6 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isUploading || status === "uploading" || status === "processing" || status === "pending_extraction" ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent"></div>
                    ) : status === "pending_review" ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : status === "needs_review" ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    ) : status === "failed" ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/25">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-slate-400"></div>
                    )}

                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {getStatusText(status)}
                      </p>
                      {meetingId && (
                        <p className="text-[10px] text-muted-text font-mono mt-0.5">
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
                      className="px-3 py-1.5 rounded-lg border border-card-border hover:border-slate-400 dark:hover:border-slate-700 bg-card-bg text-xs font-semibold text-muted-text hover:text-foreground transition-all duration-200 cursor-pointer"
                    >
                      Start New Session
                    </button>
                  )}
                </div>

                {/* Pulsing visual progress bar */}
                {(isUploading || status === "uploading" || status === "processing" || status === "pending_extraction") && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-secondary">
                    <div className="h-full bg-accent-primary animate-pulse w-3/4 rounded-full"></div>
                  </div>
                )}

                {/* Final Outcome Notifications */}
                {status === "pending_review" && (
                  <div className="mt-2 flex flex-col space-y-3">
                    <div className="text-xs text-emerald-600 dark:text-emerald-455 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                      ✓ <strong>Success:</strong> Meeting analysis successfully completed and saved. It is ready for review.
                    </div>
                    {meetingId && (
                      <Link
                        href={`/meetings/${meetingId}`}
                        className="inline-flex items-center justify-center cursor-pointer rounded-lg bg-accent-primary hover:opacity-95 py-2.5 px-4 text-xs font-bold text-white shadow-sm transition-all duration-200 text-center"
                      >
                        Go to Meeting Analysis
                      </Link>
                    )}
                  </div>
                )}
                {status === "needs_review" && (
                  <div className="mt-2 flex flex-col space-y-3">
                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                      ⚠ <strong>Attention Required:</strong> Meeting analysis is complete but flagged for manual human review due to low extraction confidence.
                    </div>
                    {meetingId && (
                      <Link
                        href={`/meetings/${meetingId}`}
                        className="inline-flex items-center justify-center cursor-pointer rounded-lg bg-accent-primary hover:opacity-95 py-2.5 px-4 text-xs font-bold text-white shadow-sm transition-all duration-200 text-center"
                      >
                        Go to Meeting Analysis
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Global Error Banner */}
            {error && (
              <div className="mt-6 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600 dark:text-rose-400 animate-fadeIn">
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-rose-500"
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
        </main>
      </div>
    </ProtectedRoute>
  );
}
