"use client";

import React, { useState } from "react";
import { TranscriptResponse } from "@/types/meeting";

interface TranscriptViewerProps {
  transcript: TranscriptResponse | null;
  loading: boolean;
  error: string | null;
}

export default function TranscriptViewer({
  transcript,
  loading,
  error,
}: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
        <p className="text-sm text-muted-text">Loading transcript...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-sm text-rose-600 dark:text-rose-400">
        <p className="font-bold">Failed to load transcript</p>
        <p className="text-xs mt-1 text-muted-text">{error}</p>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="rounded-xl border border-card-border bg-background p-8 text-center text-muted-text text-sm">
        No transcript available.
      </div>
    );
  }

  const textToDisplay = transcript.processed_text || transcript.raw_text || "";

  const paragraphs = textToDisplay
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const filteredParagraphs = paragraphs.filter((p) =>
    p.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-card-border bg-background/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground font-sans">Transcript</h2>
          <p className="text-xs text-muted-text">
            {transcript.processed_text ? "Speaker-mapped diarized text" : "Raw transcript"}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-48 rounded-lg bg-background border border-card-border pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted-text/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
          <svg
            className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-text"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[600px] scrollbar-thin">
        {filteredParagraphs.length === 0 ? (
          <p className="text-sm text-muted-text text-center py-8">
            {searchTerm ? "No matches found." : "Transcript is empty."}
          </p>
        ) : (
          filteredParagraphs.map((p, idx) => {
            const speakerMatch = p.match(/^([^:]+):/);
            if (speakerMatch) {
              const speakerName = speakerMatch[1];
              const restText = p.slice(speakerName.length + 1).trim();

              return (
                <div key={idx} className="space-y-1 animate-fadeIn">
                  <span className="text-xs font-bold text-accent-primary tracking-wide">
                    {speakerName}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed bg-background p-3 rounded-lg border border-card-border/60">
                    {restText}
                  </p>
                </div>
              );
            }

            return (
              <p
                key={idx}
                className="text-sm text-foreground leading-relaxed bg-background p-3 rounded-lg border border-card-border/60 animate-fadeIn"
              >
                {p}
              </p>
            );
          })
        )}
      </div>
    </div>
  );
}
