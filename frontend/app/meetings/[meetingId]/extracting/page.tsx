"use client";

import React, { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMeetingStatus } from "@/hooks/useMeetingStatus";
import ExtractionStatus from "@/components/meetings/ExtractionStatus";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

interface ExtractionProgressPageProps {
  params: Promise<{ meetingId: string }>;
}

export default function ExtractionProgressPage({ params }: ExtractionProgressPageProps) {
  const { meetingId } = use(params);
  const router = useRouter();
  const { logout, user } = useAuth();

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 to-zinc-950 px-4 py-12 text-slate-100 font-sans">
        {user && (
          <div className="w-full max-w-md flex items-center justify-between mb-4 px-2">
            <div className="text-xs text-slate-400">
              Signed in as <span className="font-bold text-slate-350">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="cursor-pointer text-xs font-bold text-slate-400 hover:text-rose-450 transition-colors border border-slate-800 hover:border-rose-900/40 bg-slate-900/50 px-3 py-1.5 rounded-lg"
            >
              Logout
            </button>
          </div>
        )}
        <ExtractionStatus error={displayError} onRetry={isFailed || error ? handleRetry : undefined} />
      </div>
    </ProtectedRoute>
  );
}
