"use client";

import React, { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMeetingStatus } from "@/hooks/useMeetingStatus";
import ExtractionStatus from "@/components/meetings/ExtractionStatus";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/components/ThemeContext";
import Link from "next/link";

interface ExtractionProgressPageProps {
  params: Promise<{ meetingId: string }>;
}

export default function ExtractionProgressPage({ params }: ExtractionProgressPageProps) {
  const { meetingId } = use(params);
  const router = useRouter();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const { meeting, loading, error } = useMeetingStatus(meetingId);

  useEffect(() => {
    if (!meeting) return;

    // If extraction completes successfully or requires review, navigate to review page
    if (
      meeting.status === "pending_review" ||
      meeting.status === "needs_review" ||
      meeting.status === "approved"
    ) {
      router.push(`/meetings/${meetingId}/review`);
    }
  }, [meeting, meetingId, router]);

  // Handle failure state in polling
  const isFailed = meeting?.status === "failed";
  const displayError = error || (isFailed ? "Meeting analysis failed on the server." : null);

  const handleRetry = () => {
    // Simply reloading the page restarts the hook and refetches the status.
    window.location.reload();
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
                className="text-xs font-bold transition-all relative py-1 text-muted-text hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="text-xs font-bold transition-all relative py-1 text-muted-text hover:text-foreground"
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

        {/* Main Loading Card Area */}
        <main className="flex-1 flex items-center justify-center p-6 bg-background">
          <ExtractionStatus error={displayError} onRetry={isFailed || error ? handleRetry : undefined} />
        </main>
      </div>
    </ProtectedRoute>
  );
}
