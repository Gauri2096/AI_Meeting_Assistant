"use client";

import React, { useState } from "react";
import { SpeakerResponse, SpeakerDetails } from "@/types/speaker";
import SpeakerCard from "./SpeakerCard";

interface SpeakerMappingFormProps {
  speakers: SpeakerResponse[];
  onSubmit: (mapping: Record<string, SpeakerDetails>) => void;
  isSubmitting: boolean;
}

export default function SpeakerMappingForm({
  speakers,
  onSubmit,
  isSubmitting,
}: SpeakerMappingFormProps) {
  // Initialize state with default speaker details
  const [formValues, setFormValues] = useState<Record<string, SpeakerDetails>>(() => {
    const initial: Record<string, SpeakerDetails> = {};
    speakers.forEach((sp) => {
      initial[sp.speaker_label] = {
        name: sp.current_name || "",
        email: sp.current_email || "",
        department: "",
        role: "",
      };
    });
    return initial;
  });

  const handleSpeakerChange = (label: string, details: SpeakerDetails) => {
    setFormValues((prev) => ({
      ...prev,
      [label]: details,
    }));
  };

  // Helper to validate email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Check validity: all speakers must have a non-empty name and a valid email format
  const isFormValid = speakers.every((sp) => {
    const val = formValues[sp.speaker_label];
    return val && val.name.trim() !== "" && val.email.trim() !== "" && isValidEmail(val.email);
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
            value={formValues[sp.speaker_label] || { name: "", email: "", department: "", role: "" }}
            onChange={(details) => handleSpeakerChange(sp.speaker_label, details)}
            validationError={
              formValues[sp.speaker_label]?.email && !isValidEmail(formValues[sp.speaker_label].email)
                ? "Please enter a valid email address."
                : undefined
            }
          />
        ))}
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="w-full md:w-auto cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/30 transition-all duration-300 hover:from-violet-500 hover:to-indigo-500 hover:shadow-indigo-900/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-violet-600 disabled:hover:to-indigo-600"
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
