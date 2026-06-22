"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSpeakers, updateSpeakers } from "@/lib/api/meetings";
import { SpeakerResponse, SpeakerDetails } from "@/types/speaker";
import SpeakerMappingForm from "@/components/meetings/SpeakerMappingForm";

interface SpeakerMappingPageProps {
  params: Promise<{ meetingId: string }>;
}

export default function SpeakerMappingPage({ params }: SpeakerMappingPageProps) {
  const { meetingId } = use(params);
  const router = useRouter();

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 to-zinc-950 px-4 py-12 text-slate-100 font-sans">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Meeting Speakers
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Assign names to detected speakers before AI analysis begins.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-rose-950/50 bg-rose-950/20 p-4 text-sm text-rose-400 animate-fadeIn">
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
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Analyzing speakers...</p>
          </div>
        ) : speakers.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-slate-400">No speakers were detected in this meeting recording.</p>
            <button
              onClick={() => router.push("/upload")}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all cursor-pointer"
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
    </div>
  );
}
