"use client";

import React, { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMeetingStatus } from "@/hooks/useMeetingStatus";
import ExtractionStatus from "@/components/meetings/ExtractionStatus";

interface ExtractionProgressPageProps {
  params: Promise<{ meetingId: string }>;
}

export default function ExtractionProgressPage({ params }: ExtractionProgressPageProps) {
  const { meetingId } = use(params);
  const router = useRouter();
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 to-zinc-950 px-4 py-12 text-slate-100 font-sans">
      <ExtractionStatus error={displayError} onRetry={isFailed || error ? handleRetry : undefined} />
    </div>
  );
}
