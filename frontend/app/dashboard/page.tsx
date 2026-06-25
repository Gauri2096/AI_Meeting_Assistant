"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { listMeetings } from "@/lib/api/meetings";
import { MeetingListItem } from "@/types/meeting";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/components/ThemeContext";

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeetings() {
      setLoading(true);
      setError(null);
      try {
        const data = await listMeetings();
        setMeetings(data);
      } catch (err: any) {
        console.error("Failed to load meetings list:", err);
        setError(err.message || "Failed to load meetings.");
      } finally {
        setLoading(false);
      }
    }

    loadMeetings();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative transition-colors duration-150">
        {/* Navbar / Top Bar */}
        <header className="border-b border-card-border bg-card-bg sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm transition-colors duration-150">
          <div className="flex items-center space-x-6">
            <h1 className="text-lg font-extrabold text-accent-primary">
              MeetIntel
            </h1>

            {/* Navigation links */}
            <nav className="flex items-center space-x-4 border-l border-card-border pl-6">
              <Link
                href="/dashboard"
                className={`text-xs font-bold transition-all relative py-1 ${pathname === "/dashboard"
                    ? "text-accent-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent-primary after:rounded-full"
                    : "text-muted-text hover:text-foreground"
                  }`}
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className={`text-xs font-bold transition-all relative py-1 ${pathname === "/upload"
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

        {/* Dashboard Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 animate-fadeIn">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Your Meetings</h2>
              <p className="text-muted-text text-sm mt-1.5">
                Review analyzed transcripts, insights, action items, and download summaries.
              </p>
            </div>
            <button
              onClick={() => router.push("/upload")}
              className="cursor-pointer inline-flex items-center justify-center space-x-2 rounded-xl bg-accent-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Meeting</span>
            </button>
          </div>

          {/* Loader or Error or Listing */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
              <p className="text-sm text-muted-text">Fetching meetings list...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center space-y-4 max-w-lg mx-auto">
              <h3 className="text-lg font-bold text-rose-500">Failed to Load Dashboard</h3>
              <p className="text-sm text-muted-text leading-relaxed">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-accent-primary text-xs font-bold text-white transition-all hover:opacity-90 cursor-pointer"
              >
                Retry Request
              </button>
            </div>
          ) : meetings.length === 0 ? (
            <div className="rounded-2xl border border-card-border bg-card-bg p-16 text-center space-y-6 max-w-xl mx-auto border-dashed">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background border border-card-border text-muted-text">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">No meetings found</h3>
                <p className="text-sm text-muted-text max-w-sm mx-auto leading-relaxed">
                  Get started by uploading a new audio or video meeting recording for processing.
                </p>
              </div>
              <button
                onClick={() => router.push("/upload")}
                className="px-5 py-2.5 rounded-lg bg-accent-primary text-xs font-bold text-white transition-all inline-flex items-center space-x-1.5 shadow-sm hover:opacity-90 cursor-pointer"
              >
                <span>Upload a Meeting</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                  className="group cursor-pointer rounded-2xl border border-card-border bg-card-bg hover:border-slate-400 dark:hover:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* Approved highlighted in tasteful muted gold/yellow, others in muted blue */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meeting.status === "approved"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : meeting.status === "needs_review"
                            ? "bg-amber-500/5 text-amber-600/80 dark:text-amber-500/80 border border-amber-500/10"
                            : meeting.status === "failed"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-accent-secondary text-accent-primary border border-accent-primary/20"
                        }`}>
                        {meeting.status.replace("_", " ")}
                      </span>

                      {/* Edit Permission Badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${meeting.can_edit
                          ? "bg-accent-secondary text-accent-primary border border-accent-primary/10"
                          : "bg-background text-muted-text border border-card-border"
                        }`}>
                        {meeting.can_edit ? "Creator" : "Attendee"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-foreground group-hover:text-accent-primary transition-colors line-clamp-2 leading-snug">
                      {meeting.title || "Untitled Meeting"}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-muted-text">
                    <div className="flex items-center space-x-1">
                      <span className="font-mono bg-background px-1.5 py-0.5 rounded border border-card-border text-[10px]">
                        ID: {meeting.id.slice(0, 8)}
                      </span>
                    </div>

                    <div className="flex flex-col text-right text-[10px] space-y-1">
                      <span>Source: <strong className="text-foreground capitalize font-semibold">{meeting.source}</strong></span>
                      <span>{formatDate(meeting.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
