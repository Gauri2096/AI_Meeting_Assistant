"use client";

import React from "react";
import { SpeakerResponse, SpeakerDetails } from "@/types/speaker";

interface SpeakerCardProps {
  speaker: SpeakerResponse;
  value: SpeakerDetails;
  onChange: (details: SpeakerDetails) => void;
  validationError?: string;
}

export default function SpeakerCard({
  speaker,
  value,
  onChange,
  validationError,
}: SpeakerCardProps) {
  const handleChange = (field: keyof SpeakerDetails, val: string) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-md backdrop-blur-sm space-y-4 transition-all duration-300 hover:border-slate-700">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {speaker.speaker_label}
        </span>
      </div>

      {speaker.sample_quote && (
        <div className="rounded-lg bg-slate-950/30 p-3 border border-slate-900">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Sample Quote
          </p>
          <p className="text-sm italic text-slate-300">
            "{speaker.sample_quote}"
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={value.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        {/* Email Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={value.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="e.g. john@company.com"
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        {/* Department Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Department
          </label>
          <input
            type="text"
            value={value.department || ""}
            onChange={(e) => handleChange("department", e.target.value)}
            placeholder="e.g. Sales"
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        {/* Role Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Role
          </label>
          <input
            type="text"
            value={value.role || ""}
            onChange={(e) => handleChange("role", e.target.value)}
            placeholder="e.g. Director"
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>
      {validationError && (
        <p className="text-xs text-rose-400 mt-1">{validationError}</p>
      )}
    </div>
  );
}
