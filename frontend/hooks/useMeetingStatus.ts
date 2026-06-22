import { useState, useEffect } from "react";
import { getMeeting } from "@/lib/api/meetings";
import { MeetingDetail } from "@/types/meeting";

export function useMeetingStatus(meetingId: string | null | undefined) {
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Initial fetch
    async function fetchStatus() {
      try {
        const data = await getMeeting(meetingId as string);
        if (isMounted) {
          setMeeting(data);
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to fetch meeting status");
          setLoading(false);
        }
      }
    }

    fetchStatus();

    const intervalId = setInterval(async () => {
      try {
        const data = await getMeeting(meetingId as string);
        if (isMounted) {
          setMeeting(data);
          setError(null);

          // Stop polling on terminal statuses
          if (
            data.status === "failed" ||
            data.status === "pending_review" ||
            data.status === "needs_review" ||
            data.status === "approved"
          ) {
            clearInterval(intervalId);
          }
        }
      } catch (err: any) {
        // Log error but keep polling unless it's a structural failure.
        console.error("Polling error in useMeetingStatus:", err);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [meetingId]);

  return { meeting, loading, error };
}
