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
        <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 shadow-md space-y-4 animate-fadeIn">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400">Analysis Failed</h2>
          <p className="text-sm text-muted-text">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-4 py-2 bg-accent-primary hover:opacity-95 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              Retry Check
            </button>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-card-border bg-card-bg p-12 shadow-lg space-y-6">
          <div className="relative mx-auto h-20 w-20">
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 rounded-full bg-accent-primary/10 blur-xl animate-pulse" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent-secondary border border-accent-primary/20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Analyzing Meeting
            </h1>
            <p className="text-sm text-muted-text">
              Generating summary, decisions, action items and meeting intelligence.
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle">
            <div className="h-full bg-accent-primary animate-pulse w-2/3 rounded-full" />
          </div>
          <p className="text-xs text-muted-text/85 animate-pulse">
            This may take a minute or two. Please don't close this tab.
          </p>
        </div>
      )}
    </div>
  );
}
