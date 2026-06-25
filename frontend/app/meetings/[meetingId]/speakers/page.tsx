"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSpeakers, updateSpeakers } from "@/lib/api/meetings";
import { SpeakerResponse, SpeakerDetails } from "@/types/speaker";
import SpeakerMappingForm from "@/components/meetings/SpeakerMappingForm";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/components/ThemeContext";
import Link from "next/link";

interface SpeakerMappingPageProps {
  params: Promise<{ meetingId: string }>;
}

export default function SpeakerMappingPage({ params }: SpeakerMappingPageProps) {
  const { meetingId } = use(params);
  const router = useRouter();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const [speakers, setSpeakers] = useState<SpeakerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadSpeakers() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getSpeakers(meetingId);
        setSpeakers(data);
      } catch (err: any) {
        console.error("Failed to load speakers:", err);
        setError(err.message || "Failed to load detected speakers.");
      } finally {
        setIsLoading(false);
      }
    }

    if (meetingId) {
      loadSpeakers();
    }
  }, [meetingId]);

  const handleSubmit = async (mapping: Record<string, SpeakerDetails>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateSpeakers(meetingId, { speaker_map: mapping });
      // Immediately navigate to extraction status page
      router.push(`/meetings/${meetingId}/extracting`);
    } catch (err: any) {
      console.error("Failed to update speaker mapping:", err);
      setError(err.message || "Failed to save speaker mappings.");
      setIsSubmitting(false);
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

        {/* Main Content Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-8 animate-fadeIn">
          <div className="rounded-2xl border border-card-border bg-card-bg p-8 shadow-sm">
            {/* Header */}
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Meeting Speakers
              </h1>
              <p className="mt-2 text-sm text-muted-text">
                Assign names to detected speakers before AI analysis begins.
              </p>
            </div>

            {/* Global Error Banner */}
            {error && (
              <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600 dark:text-rose-400 animate-fadeIn shadow-sm">
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

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
                <p className="text-sm text-muted-text">Analyzing speakers...</p>
              </div>
            ) : speakers.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <p className="text-muted-text">No speakers were detected in this meeting recording.</p>
                <button
                  onClick={() => router.push("/upload")}
                  className="px-4 py-2.5 rounded-lg bg-accent-primary text-xs font-bold text-white transition-all hover:opacity-90 cursor-pointer shadow-sm"
                >
                  Go back to Upload
                </button>
              </div>
            ) : (
              <SpeakerMappingForm
                speakers={speakers}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
