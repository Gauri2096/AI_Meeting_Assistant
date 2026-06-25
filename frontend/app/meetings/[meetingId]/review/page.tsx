"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getMeeting, getTranscript, getIntelligence, updateIntelligence, approveMeeting } from "@/lib/api/meetings";
import { MeetingDetail, TranscriptResponse } from "@/types/meeting";
import { MeetingIntelligence } from "@/types/intelligence";
import TranscriptViewer from "@/components/meetings/TranscriptViewer";
import IntelligencePanel from "@/components/meetings/IntelligencePanel";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/components/ThemeContext";

interface ReviewPageProps {
  params: Promise<{ meetingId: string }>;
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const { meetingId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Baseline data from backend
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [editedTitle, setEditedTitle] = useState("");

  // Local state for edits
  const [originalIntelligence, setOriginalIntelligence] = useState<MeetingIntelligence | null>(null);
  const [editedIntelligence, setEditedIntelligence] = useState<MeetingIntelligence | null>(null);

  // Loading states
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [loadingTranscript, setLoadingTranscript] = useState(true);
  const [loadingIntelligence, setLoadingIntelligence] = useState(true);

  // Error states
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  // Workflow states
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [approvalTime, setApprovalTime] = useState<string | null>(null);

  // Floating notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (!meetingId) return;

    // 1. Load meeting details
    async function loadMeeting() {
      setLoadingMeeting(true);
      setMeetingError(null);
      try {
        const data = await getMeeting(meetingId);
        setMeeting(data);
        setEditedTitle(data.title || "");
        if (data.status === "approved") {
          setIsApproved(true);
        }
      } catch (err: any) {
        console.error("Failed to load meeting details:", err);
        setMeetingError(err.message || "Failed to load meeting details.");
      } finally {
        setLoadingMeeting(false);
      }
    }

    // 2. Load transcript
    async function loadTranscript() {
      setLoadingTranscript(true);
      setTranscriptError(null);
      try {
        const data = await getTranscript(meetingId);
        setTranscript(data);
      } catch (err: any) {
        console.error("Failed to load transcript:", err);
        setTranscriptError(err.message || "Failed to load transcript.");
      } finally {
        setLoadingTranscript(false);
      }
    }

    // 3. Load intelligence
    async function loadIntelligence() {
      setLoadingIntelligence(true);
      setIntelligenceError(null);
      try {
        const data = await getIntelligence(meetingId);
        setOriginalIntelligence(data);
        setEditedIntelligence(data);
      } catch (err: any) {
        console.error("Failed to load intelligence:", err);
        setIntelligenceError(err.message || "Intelligence not available.");
      } finally {
        setLoadingIntelligence(false);
      }
    }

    loadMeeting();
    loadTranscript();
    loadIntelligence();
  }, [meetingId]);

  // Save changes via PUT API
  const handleSaveChanges = async () => {
    if (!editedIntelligence) return;
    setIsSaving(true);
    setToastMessage(null);
    try {
      await updateIntelligence(meetingId, {
        title: editedTitle,
        summary: editedIntelligence.summary,
        decisions: editedIntelligence.decisions,
        topics_discussed: editedIntelligence.topics_discussed,
        risks_and_concerns: editedIntelligence.risks_and_concerns,
        notable_quotes: editedIntelligence.notable_quotes,
        action_items: editedIntelligence.action_items,
      });

      // Synchronize baseline state
      setOriginalIntelligence(editedIntelligence);
      if (meeting) {
        setMeeting({
          ...meeting,
          title: editedTitle,
        });
      }
      setToastMessage("Changes saved successfully!");
      setToastType("success");

      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error("Failed to save changes:", err);
      setToastMessage(err.message || "Failed to save changes.");
      setToastType("error");
    } finally {
      setIsSaving(false);
    }
  };

  // Final approval via POST API
  const handleApprove = async () => {
    setIsApproving(true);
    setToastMessage(null);
    try {
      await approveMeeting(meetingId);
      router.push(`/meetings/${meetingId}/success`);
    } catch (err: any) {
      console.error("Failed to approve meeting:", err);
      setToastMessage(err.message || "Failed to approve meeting.");
      setToastType("error");
    } finally {
      setIsApproving(false);
    }
  };

  // Format helper for duration
  const formatDuration = (sec: number | null) => {
    if (sec === null) return "--:--";
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Permissions checks
  const isCreator = !!(meeting && user && (meeting.organiser_email === user.email || meeting.can_edit));
  const canEdit = isCreator && !isApproved;

  // Dirty check
  const hasTitleChanges = meeting && editedTitle !== (meeting.title || "");
  const hasIntelligenceChanges =
    editedIntelligence &&
    originalIntelligence &&
    JSON.stringify(originalIntelligence) !== JSON.stringify(editedIntelligence);
  const hasChanges = hasTitleChanges || hasIntelligenceChanges;

  const isSaveDisabled = !hasChanges || isSaving;
  const isApproveDisabled = isSaving || isApproving || !editedIntelligence;

  // Main page error
  if (meetingError && !meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center space-y-4 shadow-sm">
          <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400">Failed to Load Meeting</h2>
          <p className="text-sm text-muted-text">{meetingError}</p>
          <button
            onClick={() => router.push("/upload")}
            className="w-full py-2.5 bg-accent-primary hover:opacity-95 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98]"
          >
            Return to Upload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative transition-colors duration-150">
      {/* Navbar / Top Bar */}
      <header className="border-b border-card-border bg-card-bg sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm transition-colors duration-150">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 rounded-lg bg-card-bg border border-card-border text-muted-text hover:text-foreground hover:bg-border-subtle transition-colors cursor-pointer"
            title="Go to Dashboard"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center space-x-6">
            <div>
              {loadingMeeting ? (
                <div className="h-6 w-40 bg-border-subtle animate-pulse rounded" />
              ) : !canEdit ? (
                <h1 className="text-lg font-bold text-foreground truncate max-w-xs md:max-w-md">
                  {meeting?.title || "Untitled Meeting"}
                </h1>
              ) : (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  disabled={isSaving || isApproving}
                  className="bg-background border border-card-border focus:border-accent-primary text-foreground px-3 py-1 rounded-lg text-lg font-bold focus:outline-none focus:ring-1 focus:ring-accent-primary w-64 md:w-96 transition-all"
                  placeholder="Meeting Title"
                />
              )}
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-text">
                {meeting && (
                  <>
                    <span className="font-mono bg-background px-2 py-0.5 rounded border border-card-border">
                      ID: {meetingId.slice(0, 8)}...
                    </span>
                    <span>•</span>
                    <span>Organizer: {meeting.organiser_email}</span>
                    <span>•</span>
                    <span>Duration: {formatDuration(meeting.duration_seconds)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Navigation links */}
            <nav className="hidden lg:flex items-center space-x-4 border-l border-card-border pl-6">
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
        </div>

        {/* Buttons / Badges */}
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

          {canEdit && !loadingIntelligence && editedIntelligence && (
            <div className="flex items-center space-x-2">
              {/* Save Button */}
              <button
                onClick={handleSaveChanges}
                disabled={isSaveDisabled}
                className="cursor-pointer rounded-lg border border-card-border bg-card-bg px-4 py-2 text-xs font-bold text-muted-text hover:text-foreground hover:bg-border-subtle hover:border-slate-400 dark:hover:border-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
              >
                {isSaving ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-slate-350 border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>

              {/* Approve Button */}
              <button
                onClick={handleApprove}
                disabled={isApproveDisabled}
                className="cursor-pointer rounded-lg bg-accent-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
              >
                {isApproving ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <span>Proceed / Approve</span>
                )}
              </button>
            </div>
          )}

          {!loadingMeeting && meeting && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-text uppercase font-semibold">Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                meeting.status === "approved"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : meeting.status === "needs_review"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : "bg-accent-secondary text-accent-primary border border-accent-primary/20"
              }`}>
                {meeting.status.replace("_", " ")}
              </span>
            </div>
          )}

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

      {/* Hero Banner for final approved state */}
      {isApproved && (
        <div className="mx-6 mt-6 p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Summary Approved</h2>
              <p className="text-sm text-muted-text mt-0.5">
                The meeting intelligence is locked and approved. All edit controls have been disabled.
              </p>
            </div>
          </div>
          <div className="text-right text-xs md:text-sm text-muted-text">
            <span>Approved At:</span>{" "}
            <span className="font-mono text-foreground font-semibold">{approvalTime || new Date().toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Left: Transcript */}
        <div className="h-full flex flex-col min-h-[500px]">
          <TranscriptViewer
            transcript={transcript}
            loading={loadingTranscript}
            error={transcriptError}
          />
        </div>

        {/* Right: Meeting Intelligence */}
        <div className="h-full flex flex-col min-h-[500px]">
          <IntelligencePanel
            intelligence={editedIntelligence}
            loading={loadingIntelligence}
            error={intelligenceError}
            isEditable={canEdit}
            onChange={setEditedIntelligence}
          />
        </div>
      </main>

      {/* Floating Notifications */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border backdrop-blur-md flex items-center space-x-3 animate-slideIn ${
          toastType === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
        }`}>
          {toastType === "success" ? (
            <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className="text-sm font-medium text-foreground">{toastMessage}</span>
        </div>
      )}
      </div>
    </ProtectedRoute>
  );
}
