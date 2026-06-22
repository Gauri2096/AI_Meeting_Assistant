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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-500">Loading transcript...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-950/40 bg-rose-950/15 p-6 text-center text-sm text-rose-400">
        <p>Failed to load transcript.</p>
        <p className="text-xs mt-1 text-slate-500">{error}</p>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-8 text-center text-slate-500 text-sm">
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
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-200">Transcript</h2>
          <p className="text-xs text-slate-500">
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
            className="w-full sm:w-48 rounded-lg bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <svg
            className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-600"
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
          <p className="text-sm text-slate-600 text-center py-8">
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
                  <span className="text-xs font-bold text-indigo-400 tracking-wide">
                    {speakerName}
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/20 p-3 rounded-lg border border-slate-900/50">
                    {restText}
                  </p>
                </div>
              );
            }

            return (
              <p
                key={idx}
                className="text-sm text-slate-300 leading-relaxed bg-slate-950/20 p-3 rounded-lg border border-slate-900/50 animate-fadeIn"
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
