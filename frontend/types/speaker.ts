export interface SpeakerDetails {
  name: string;
  email: string;
  department?: string | null;
  role?: string | null;
}

export interface SpeakerMappingRequest {
  speaker_map: Record<string, string>;
}

export interface SpeakerResponse {
  speaker_label: string; // e.g. SPEAKER_00
  sample_quote: string;
  current_name: string | null;
  current_email: string | null;
}
