"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMeeting, getTranscript, getIntelligence, updateIntelligence, approveMeeting } from "@/lib/api/meetings";
import { MeetingDetail, TranscriptResponse } from "@/types/meeting";
import { MeetingIntelligence } from "@/types/intelligence";
import TranscriptViewer from "@/components/meetings/TranscriptViewer";
import IntelligencePanel from "@/components/meetings/IntelligencePanel";

interface ReviewPageProps {
  params: Promise<{ meetingId: string }>;
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const { meetingId } = use(params);
  const router = useRouter();

  // Baseline data from backend
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);

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
        summary: editedIntelligence.summary,
        decisions: editedIntelligence.decisions,
        topics_discussed: editedIntelligence.topics_discussed,
        risks_and_concerns: editedIntelligence.risks_and_concerns,
        notable_quotes: editedIntelligence.notable_quotes,
        action_items: editedIntelligence.action_items,
      });

      // Synchronize baseline state
      setOriginalIntelligence(editedIntelligence);
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
      const response = await approveMeeting(meetingId);

      setIsApproved(true);
      setApprovalTime(response.approved_at || new Date().toLocaleString());

      // Update meeting status badge locally without refetching
      if (meeting) {
        setMeeting({
          ...meeting,
          status: "approved",
        });
      }

      setToastMessage("Summary approved successfully!");
      setToastType("success");

      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
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

  // Dirty check
  const hasChanges =
    editedIntelligence &&
    originalIntelligence &&
    JSON.stringify(originalIntelligence) !== JSON.stringify(editedIntelligence);

  const isSaveDisabled = !hasChanges || isSaving;
  const isApproveDisabled = isSaving || isApproving || !editedIntelligence;

  // Main page error
  if (meetingError && !meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-slate-100 p-6 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-rose-950 bg-rose-950/20 p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-rose-400">Failed to Load Meeting</h2>
          <p className="text-sm text-slate-400">{meetingError}</p>
          <button
            onClick={() => router.push("/upload")}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Return to Upload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative">
      {/* Navbar / Top Bar */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/upload")}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Go to Upload"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            {loadingMeeting ? (
              <div className="h-6 w-40 bg-slate-800 animate-pulse rounded" />
            ) : (
              <h1 className="text-lg font-bold text-slate-200 truncate max-w-xs md:max-w-md">
                {meeting?.title || "Untitled Meeting"}
              </h1>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
              {meeting && (
                <>
                  <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
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
        </div>

        {/* Buttons / Badges */}
        <div className="flex items-center space-x-4">
          {!isApproved && !loadingIntelligence && editedIntelligence && (
            <div className="flex items-center space-x-2">
              {/* Save Button */}
              <button
                onClick={handleSaveChanges}
                disabled={isSaveDisabled}
                className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
              >
                {isSaving ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-transparent" />
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
                className="cursor-pointer rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
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
              <span className="text-xs text-slate-500 uppercase font-semibold">Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                meeting.status === "approved"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : meeting.status === "needs_review"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              }`}>
                {meeting.status.replace("_", " ")}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Hero Banner for final approved state */}
      {isApproved && (
        <div className="mx-6 mt-6 p-6 rounded-2xl border border-emerald-900/30 bg-emerald-950/15 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-400">Summary Approved</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                The meeting intelligence is locked and approved. All edit controls have been disabled.
              </p>
            </div>
          </div>
          <div className="text-right text-xs md:text-sm text-slate-400">
            <span className="text-slate-500">Approved At:</span>{" "}
            <span className="font-mono text-slate-200">{approvalTime || new Date().toLocaleString()}</span>
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
            isEditable={!isApproved}
            onChange={setEditedIntelligence}
          />
        </div>
      </main>

      {/* Floating Notifications */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-center space-x-3 animate-slideIn ${
          toastType === "success"
            ? "bg-emerald-950/90 border-emerald-800 text-emerald-300"
            : "bg-rose-950/90 border-rose-800 text-rose-300"
        }`}>
          {toastType === "success" ? (
            <svg className="h-5 w-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
