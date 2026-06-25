"use client";

import React, { useState } from "react";
import { SpeakerResponse } from "@/types/speaker";
import SpeakerCard from "./SpeakerCard";

interface SpeakerMappingFormProps {
  speakers: SpeakerResponse[];
  onSubmit: (mapping: Record<string, string>) => void;
  isSubmitting: boolean;
}

export default function SpeakerMappingForm({
  speakers,
  onSubmit,
  isSubmitting,
}: SpeakerMappingFormProps) {
  // Initialize state with default speaker details
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    speakers.forEach((sp) => {
      initial[sp.speaker_label] = sp.current_name || "";
    });
    return initial;
  });

  const handleSpeakerChange = (label: string, name: string) => {
    setFormValues((prev) => ({
      ...prev,
      [label]: name,
    }));
  };

  // Check validity: all speakers must have a non-empty name
  const isFormValid = speakers.every((sp) => {
    const name = formValues[sp.speaker_label];
    return name && name.trim() !== "";
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    onSubmit(formValues);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        {speakers.map((sp) => (
          <SpeakerCard
            key={sp.speaker_label}
            speaker={sp}
            value={formValues[sp.speaker_label] || ""}
            onChange={(name) => handleSpeakerChange(sp.speaker_label, name)}
          />
        ))}
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="w-full md:w-auto cursor-pointer rounded-xl bg-accent-primary hover:opacity-95 px-8 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center space-x-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Saving Mappings...</span>
            </span>
          ) : (
            "Submit Speaker Mappings"
          )}
        </button>
      </div>
    </form>
  );
}
