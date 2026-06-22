export interface Attendee {
  name: string;
  email: string;
  department?: string | null;
  role?: string | null;
}

export type MeetingStatus =
  | "processing"
  | "pending_speaker_mapping"
  | "extracting"
  | "pending_review"
  | "needs_review"
  | "approved"
  | "failed";

export interface MeetingDetail {
  id: string; // UUID
  title: string | null;
  status: MeetingStatus;
  source: string;
  created_at: string;
  organiser_email: string;
  attendees: Attendee[];
  duration_seconds: number | null;
  webex_meeting_id: string | null;
}

export interface MeetingListItem {
  id: string;
  title: string | null;
  status: MeetingStatus;
  source: string;
  created_at: string;
  organiser_email: string;
}

export interface MeetingCreateResponse {
  id: string;
  status: MeetingStatus;
  source: string;
}

export interface Segment {
  speaker: string;
  text: string;
  start?: number;
  end?: number;
}

export interface TranscriptResponse {
  id: string;
  meeting_id: string;
  raw_text: string;
  processed_text: string | null;
  speaker_map: Segment[];
  speaker_metadata: Record<string, Attendee> | null;
  language: string;
  created_at: string;
}
