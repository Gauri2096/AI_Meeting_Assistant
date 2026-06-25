"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getMeeting, downloadMeetingPdf, sendMeetingEmail } from "@/lib/api/meetings";
import { MeetingDetail } from "@/types/meeting";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/components/ThemeContext";

interface SuccessPageProps {
  params: Promise<{ meetingId: string }>;
}

export default function SuccessPage({ params }: SuccessPageProps) {
  const { meetingId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [meetingError, setMeetingError] = useState<string | null>(null);

  // Actions states
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) return;

    async function loadMeeting() {
      setLoadingMeeting(true);
      setMeetingError(null);
      try {
        const data = await getMeeting(meetingId);
        setMeeting(data);
      } catch (err: any) {
        console.error("Failed to load meeting details:", err);
        setMeetingError(err.message || "Failed to load meeting details.");
      } finally {
        setLoadingMeeting(false);
      }
    }

    loadMeeting();
  }, [meetingId]);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setPdfError(null);
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
    } catch (err: any) {
      console.error("Failed to download PDF:", err);
      setPdfError(err.message || "Failed to download PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailSuccess(false);
    setEmailError(null);
    try {
      const recipientsSet = new Set<string>();
      if (meeting?.organiser_email) {
        recipientsSet.add(meeting.organiser_email);
      }
      if (meeting?.attendees) {
        meeting.attendees.forEach((att) => {
          if (typeof att === "string" && att) {
            recipientsSet.add(att);
          } else if (att && (att as any).email) {
            recipientsSet.add((att as any).email);
          }
        });
      }
      
      const recipients = Array.from(recipientsSet);
      if (recipients.length === 0) {
        throw new Error("No recipients found for this meeting.");
      }

      await sendMeetingEmail(meetingId, recipients);
      setEmailSuccess(true);
    } catch (err: any) {
      console.error("Failed to send email:", err);
      setEmailError(err.message || "Failed to send email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

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
                ) : (
                  <h1 className="text-lg font-bold text-foreground truncate max-w-xs md:max-w-md">
                    {meeting?.title || "Untitled Meeting"}
                  </h1>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-text">
                  {meeting && (
                    <>
                      <span className="font-mono bg-background px-2 py-0.5 rounded border border-card-border">
                        ID: {meetingId.slice(0, 8)}...
                      </span>
                      <span>•</span>
                      <span>Organizer: {meeting.organiser_email}</span>
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

        {/* Success Card Area */}
        <main className="flex-1 flex items-center justify-center p-6 bg-background">
          <div className="w-full max-w-xl rounded-2xl border border-card-border bg-card-bg p-8 shadow-lg transition-all duration-300 space-y-8 text-center">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Meeting Summary Approved
              </h2>
              <p className="text-muted-text text-sm max-w-md mx-auto leading-relaxed">
                The meeting intelligence has been approved and the final report is ready.
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
              {/* Download PDF button */}
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="cursor-pointer inline-flex items-center justify-center space-x-2 rounded-xl bg-accent-primary px-5 py-3.5 text-sm font-bold text-white shadow-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloadingPdf ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              {/* Send Email button */}
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="cursor-pointer inline-flex items-center justify-center space-x-2 rounded-xl border border-card-border bg-card-bg px-5 py-3.5 text-sm font-bold text-muted-text hover:text-foreground hover:bg-border-subtle hover:border-slate-400 dark:hover:border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingEmail ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-350 border-t-transparent" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Send via Email</span>
                  </>
                )}
              </button>
            </div>

            {/* Status alerts for actions */}
            <div className="max-w-md mx-auto space-y-3">
              {/* PDF Error Status */}
              {pdfError && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center space-x-2 animate-fadeIn">
                  <svg className="h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{pdfError}</span>
                </div>
              )}

              {/* Email Success Status */}
              {emailSuccess && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-2 animate-fadeIn">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Email sent successfully!</span>
                </div>
              )}

              {/* Email Error Status */}
              {emailError && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center space-x-2 animate-fadeIn">
                  <svg className="h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{emailError}</span>
                </div>
              )}
            </div>

            {/* Back Navigation */}
            <div className="pt-6 border-t border-card-border">
              <button
                onClick={() => router.push("/dashboard")}
                className="cursor-pointer text-xs font-semibold text-accent-primary hover:opacity-90 transition-colors inline-flex items-center space-x-1"
              >
                <span>Return to Dashboard</span>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
