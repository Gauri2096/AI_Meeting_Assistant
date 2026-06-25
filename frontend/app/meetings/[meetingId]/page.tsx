"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  getMeeting,
  getTranscript,
  getIntelligence,
  updateIntelligence,
  approveMeeting,
  downloadMeetingPdf,
  retryTranscription,
  getSpeakers,
  updateSpeakers,
  sendMeetingEmail
} from "@/lib/api/meetings";
import { MeetingDetail, TranscriptResponse } from "@/types/meeting";
import { MeetingIntelligence } from "@/types/intelligence";
import TranscriptViewer from "@/components/meetings/TranscriptViewer";
import IntelligencePanel from "@/components/meetings/IntelligencePanel";
import { useAuth } from "@/hooks/useAuth";
import { getToken } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/components/ThemeContext";

interface MeetingDetailsPageProps {
  params: Promise<{ meetingId: string }>;
}

export default function MeetingDetailsPage({ params }: MeetingDetailsPageProps) {
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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [pdfExists, setPdfExists] = useState<boolean | null>(null);

  // Error states
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  // Workflow states
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Floating notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | null>(null);

  const checkPdfExists = async (id: string): Promise<boolean> => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE_URL}/meetings/${id}/pdf`, {
        method: "GET",
        headers,
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  };

  const loadMeeting = async () => {
    setLoadingMeeting(true);
    setMeetingError(null);
    try {
      const data = await getMeeting(meetingId);
      setMeeting(data);
      setEditedTitle(data.title || "");
      if (data.status === "approved") {
        const exists = await checkPdfExists(meetingId);
        setPdfExists(exists);
      }
    } catch (err: any) {
      console.error("Failed to load meeting details:", err);
      setMeetingError(err.message || "Failed to load meeting details.");
    } finally {
      setLoadingMeeting(false);
    }
  };

  const loadTranscript = async () => {
    setLoadingTranscript(true);
    setTranscriptError(null);
    try {
      const data = await getTranscript(meetingId);
      setTranscript(data);
    } catch (err: any) {
      if (err.message && (err.message.includes("not found") || err.message.includes("Not Found"))) {
        setTranscript(null);
        setTranscriptError("Transcript not found");
      } else {
        console.error("Failed to load transcript:", err);
        setTranscriptError(err.message || "Failed to load transcript.");
      }
    } finally {
      setLoadingTranscript(false);
    }
  };

  const loadIntelligence = async () => {
    setLoadingIntelligence(true);
    setIntelligenceError(null);
    try {
      const data = await getIntelligence(meetingId);
      setOriginalIntelligence(data);
      setEditedIntelligence(data);
    } catch (err: any) {
      if (err.message && (err.message.includes("not found") || err.message.includes("Not Found") || err.message.includes("not available"))) {
        setOriginalIntelligence(null);
        setEditedIntelligence(null);
        setIntelligenceError("Intelligence not found");
      } else {
        console.error("Failed to load intelligence:", err);
        setIntelligenceError(err.message || "Intelligence not available.");
      }
    } finally {
      setLoadingIntelligence(false);
    }
  };

  const refreshAllData = async () => {
    await Promise.allSettled([
      loadMeeting(),
      loadTranscript(),
      loadIntelligence(),
    ]);
  };

  useEffect(() => {
    if (meetingId) {
      refreshAllData();
    }
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

  // Download PDF
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setToastMessage(null);
    try {
      const blob = await downloadMeetingPdf(meetingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const meetingTitle = meeting?.title || "meeting";
      const cleanTitle = meetingTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      a.download = `${cleanTitle}_summary.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setToastMessage("PDF downloaded successfully!");
      setToastType("success");
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error("Failed to download PDF:", err);
      setToastMessage(err.message || "Failed to download PDF.");
      setToastType("error");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Retry Transcription via POST API
  const handleRetryTranscription = async () => {
    setIsActionLoading(true);
    setToastMessage(null);
    try {
      await retryTranscription(meetingId);
      setToastMessage("Transcription retry triggered successfully!");
      setToastType("success");
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      await refreshAllData();
    } catch (err: any) {
      console.error("Failed to retry transcription:", err);
      setToastMessage(err.message || "Failed to retry transcription.");
      setToastType("error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Trigger/Retry Intelligence Extraction
  const handleExtractIntelligence = async () => {
    setIsActionLoading(true);
    setToastMessage(null);
    try {
      let speakers = [];
      try {
        speakers = await getSpeakers(meetingId);
      } catch (e) {
        console.warn("No speakers retrieved, proceeding with empty map:", e);
      }
      
      const speakerMap: Record<string, any> = {};
      speakers.forEach((s) => {
        speakerMap[s.speaker_label] = {
          name: s.current_name || s.speaker_label,
          email: s.current_email || `${s.speaker_label.toLowerCase()}@bank.com`,
          department: "General",
          role: "Attendee"
        };
      });
      
      if (meeting?.attendees) {
        meeting.attendees.forEach((att) => {
          const matchedSpeaker = speakers.find(s => s.current_email === att.email || s.current_name === att.name);
          if (matchedSpeaker) {
            speakerMap[matchedSpeaker.speaker_label] = {
              name: att.name,
              email: att.email,
              department: att.department || "General",
              role: att.role || "Attendee"
            };
          }
        });
      }

      await updateSpeakers(meetingId, { speaker_map: speakerMap });
      setToastMessage("Intelligence extraction triggered successfully!");
      setToastType("success");
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      await refreshAllData();
    } catch (err: any) {
      console.error("Failed to extract intelligence:", err);
      setToastMessage(err.message || "Failed to extract intelligence.");
      setToastType("error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setIsActionLoading(true);
    setToastMessage(null);
    try {
      await approveMeeting(meetingId);
      setToastMessage("PDF generated successfully!");
      setToastType("success");
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      await refreshAllData();
    } catch (err: any) {
      console.error("Failed to generate PDF:", err);
      setToastMessage(err.message || "Failed to generate PDF.");
      setToastType("error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!meeting) return;
    setIsSendingEmail(true);
    setToastMessage(null);
    try {
      // Gather recipients: organizer + attendees
      const recipientsSet = new Set<string>();
      if (meeting.organiser_email) {
        recipientsSet.add(meeting.organiser_email);
      }
      if (meeting.attendees) {
        meeting.attendees.forEach((att) => {
          if (att.email) {
            recipientsSet.add(att.email);
          }
        });
      }

      const recipients = Array.from(recipientsSet);
      if (recipients.length === 0) {
        throw new Error("No recipients found for this meeting.");
      }

      await sendMeetingEmail(meetingId, recipients);
      setToastMessage("Email report sent successfully!");
      setToastType("success");
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error("Failed to send email:", err);
      setToastMessage(err.message || "Failed to send email.");
      setToastType("error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getMappedStatus = () => {
    if (!meeting) return "";
    const status = meeting.status;

    if (status === "failed") {
      if (!transcript) {
        return "failed_transcription";
      }
      if (!originalIntelligence) {
        return "failed_extraction";
      }
      return "failed";
    }

    return status;
  };

  const renderRecoveryAction = () => {
    if (!meeting) return null;

    const showButton = (
      label: string,
      onClick: () => void,
      icon?: React.ReactNode,
      variant: "primary" | "secondary" | "danger" | "success" = "primary",
      loading: boolean = false
    ) => {
      let btnClasses =
        "cursor-pointer rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 ";
      if (variant === "primary") {
        btnClasses += "bg-accent-primary text-white hover:opacity-95";
      } else if (variant === "secondary") {
        btnClasses +=
          "border border-card-border bg-card-bg text-muted-text hover:text-foreground hover:bg-border-subtle";
      } else if (variant === "danger") {
        btnClasses += "bg-rose-650 text-white hover:bg-rose-700";
      } else if (variant === "success") {
        btnClasses += "bg-emerald-600 text-white hover:bg-emerald-700";
      }

      return (
        <button
          onClick={onClick}
          disabled={isActionLoading || isDownloadingPdf || isSendingEmail}
          className={btnClasses}
        >
          {loading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
              <span>Executing...</span>
            </>
          ) : (
            <>
              {icon}
              <span>{label}</span>
            </>
          )}
        </button>
      );
    };

    const status = getMappedStatus();

    // Hide recovery actions from users who cannot edit the meeting (isCreator === false)
    // Exception: Download PDF / Send Email is visible to everyone on approved meetings.
    if (!isCreator) {
      if (status === "approved" && pdfExists) {
        return (
          <div className="flex items-center space-x-2">
            {showButton(
              "Download PDF",
              handleDownloadPdf,
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>,
              "success",
              isDownloadingPdf
            )}
            {showButton(
              "Send Email",
              handleSendEmail,
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>,
              "primary",
              isSendingEmail
            )}
          </div>
        );
      }
      return null;
    }

    switch (status) {
      case "failed_transcription":
        return showButton(
          "Retry Transcription",
          handleRetryTranscription,
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.571M21.21 2v5h-5.122" />
          </svg>,
          "danger",
          isActionLoading
        );
      case "pending_speaker_mapping":
        return showButton(
          "Complete Speaker Mapping",
          () => router.push(`/meetings/${meetingId}/speakers`),
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>,
          "primary"
        );
      case "failed_speaker_mapping":
        return showButton(
          "Retry Speaker Mapping",
          () => router.push(`/meetings/${meetingId}/speakers`),
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.571M21.21 2v5h-5.122" />
          </svg>,
          "danger"
        );
      case "pending_extraction":
        return showButton(
          "Extract Intelligence",
          handleExtractIntelligence,
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>,
          "primary",
          isActionLoading
        );
      case "failed_extraction":
        return showButton(
          "Retry Intelligence Extraction",
          handleExtractIntelligence,
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.571M21.21 2v5h-5.122" />
          </svg>,
          "danger",
          isActionLoading
        );
      case "approved":
        if (pdfExists) {
          return (
            <div className="flex items-center space-x-2">
              {showButton(
                "Download PDF",
                handleDownloadPdf,
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>,
                "success",
                isDownloadingPdf
              )}
              {showButton(
                "Send Email",
                handleSendEmail,
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>,
                "primary",
                isSendingEmail
              )}
            </div>
          );
        } else {
          return showButton(
            "Generate PDF",
            handleGeneratePdf,
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>,
            "primary",
            isActionLoading
          );
        }
      default:
        return null;
    }
  };

  const renderStatusCard = (title: string, description: string, actionButton?: React.ReactNode) => {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card-bg border border-card-border rounded-2xl shadow-sm text-center space-y-4 h-full min-h-[400px] transition-colors duration-150">
        <div className="p-3 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
          <svg className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-text">{description}</p>
        </div>
        {actionButton && <div className="pt-2">{actionButton}</div>}
      </div>
    );
  };

  const renderTranscriptPanel = () => {
    if (loadingMeeting) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 bg-card-bg border border-card-border rounded-2xl h-full min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
        </div>
      );
    }

    if (!meeting) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 bg-card-bg border border-card-border rounded-2xl h-full min-h-[400px] text-center text-muted-text">
          Meeting details not found.
        </div>
      );
    }

    const mappedStatus = getMappedStatus();

    if (meeting.status === "processing") {
      return renderStatusCard(
        "Meeting Processing",
        "The meeting audio/video recording is currently being uploaded and processed. Please wait..."
      );
    }

    if (mappedStatus === "failed_transcription") {
      return renderStatusCard(
        "Transcription Failed",
        "An error occurred during audio transcription. Trigger a retry to attempt processing again.",
        renderRecoveryAction()
      );
    }

    return (
      <TranscriptViewer
        transcript={transcript}
        loading={loadingTranscript}
        error={transcriptError}
      />
    );
  };

  const renderIntelligencePanel = () => {
    if (loadingMeeting) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 bg-card-bg border border-card-border rounded-2xl h-full min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
        </div>
      );
    }

    if (!meeting) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 bg-card-bg border border-card-border rounded-2xl h-full min-h-[400px] text-center text-muted-text">
          Meeting details not found.
        </div>
      );
    }

    const mappedStatus = getMappedStatus();

    if (meeting.status === "processing") {
      return renderStatusCard(
        "Intelligence Extraction Pending",
        "AI intelligence extraction will start automatically once audio transcription is complete."
      );
    }

    if (mappedStatus === "failed_transcription") {
      return renderStatusCard(
        "Intelligence Extraction Blocked",
        "AI intelligence extraction cannot run because the audio transcription failed."
      );
    }

    if (mappedStatus === "pending_speaker_mapping" || mappedStatus === "failed_speaker_mapping") {
      const isFailed = mappedStatus === "failed_speaker_mapping";
      return renderStatusCard(
        isFailed ? "Speaker Mapping Failed" : "Speaker Mapping Required",
        isFailed
          ? "The speaker mapping process failed. Click below to re-configure the speaker names and try again."
          : "Please assign names to the detected speakers before AI intelligence extraction can begin.",
        renderRecoveryAction()
      );
    }

    if (mappedStatus === "pending_extraction" || mappedStatus === "failed_extraction" || meeting.status === "extracting") {
      const isFailed = mappedStatus === "failed_extraction";
      const isExtracting = meeting.status === "extracting";
      return renderStatusCard(
        isExtracting
          ? "Extracting Intelligence"
          : isFailed
          ? "Extraction Failed"
          : "Intelligence Extraction Pending",
        isExtracting
          ? "AI is currently extracting action items, decisions, and summaries. This may take a few moments..."
          : isFailed
          ? "An error occurred during AI intelligence extraction. You can retry the extraction process below."
          : "Audio transcription and speaker mapping are complete. Start extracting meeting intelligence now.",
        isExtracting ? undefined : renderRecoveryAction()
      );
    }

    return (
      <IntelligencePanel
        intelligence={editedIntelligence}
        loading={loadingIntelligence}
        error={intelligenceError}
        isEditable={canEdit}
        onChange={setEditedIntelligence}
      />
    );
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
  const isApproved = meeting?.status === "approved";
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
            onClick={() => router.push("/dashboard")}
            className="w-full py-2.5 bg-accent-primary hover:opacity-95 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98]"
          >
            Return to Dashboard
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

            {loadingMeeting ? (
              <div className="h-8 w-40 bg-border-subtle animate-pulse rounded" />
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

            {/* Recovery/Retry Actions and PDF download */}
            {renderRecoveryAction()}

            {/* Creator actions (Save/Approve - only visible if user has edit rights and not approved) */}
            {canEdit && !loadingIntelligence && editedIntelligence && (
              <div className="flex items-center space-x-2">
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

            {/* Meeting Status Badge */}
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

        {/* Meeting Metadata Subheader */}
        {!loadingMeeting && meeting && (
          <div className="bg-background border-b border-card-border px-6 py-2.5 flex flex-wrap items-center gap-4 text-xs text-muted-text shadow-sm">
            <span className="font-mono bg-background px-2 py-0.5 rounded border border-card-border">
              ID: {meetingId}
            </span>
            <span>•</span>
            <span>Organizer: {meeting.organiser_email}</span>
            <span>•</span>
            <span>Duration: {formatDuration(meeting.duration_seconds)}</span>
            <span>•</span>
            <span>Role: <strong className="text-foreground">{isCreator ? "Creator (Can Edit)" : "Attendee (Read-Only)"}</strong></span>
          </div>
        )}

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
            {meeting.created_at && (
              <div className="text-right text-xs md:text-sm text-muted-text">
                <span>Created At:</span>{" "}
                <span className="font-mono text-foreground font-semibold">{new Date(meeting.created_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Main Content Layout */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
          {/* Left: Transcript */}
          <div className="h-full flex flex-col min-h-[500px]">
            {renderTranscriptPanel()}
          </div>

          {/* Right: Meeting Intelligence */}
          <div className="h-full flex flex-col min-h-[500px]">
            {renderIntelligencePanel()}
          </div>
        </main>

        {/* Floating Toast Notifications */}
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
