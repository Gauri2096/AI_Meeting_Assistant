"use client";

import React from "react";

interface ExtractionStatusProps {
  error: string | null;
  onRetry?: () => void;
}

export default function ExtractionStatus({ error, onRetry }: ExtractionStatusProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {error ? (
        <div className="w-full max-w-md rounded-2xl border border-rose-900/30 bg-rose-950/15 p-8 shadow-xl space-y-4 animate-fadeIn">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-rose-400">Analysis Failed</h2>
          <p className="text-sm text-slate-400">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              Retry Check
            </button>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-12 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="relative mx-auto h-20 w-20">
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-indigo-950/30 border border-indigo-500/30">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              Analyzing Meeting
            </h1>
            <p className="text-sm text-slate-400">
              Generating summary, decisions, action items and meeting intelligence.
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse w-2/3 rounded-full" />
          </div>
          <p className="text-xs text-slate-500 animate-pulse">
            This may take a minute or two. Please don't close this tab.
          </p>
        </div>
      )}
    </div>
  );
}
