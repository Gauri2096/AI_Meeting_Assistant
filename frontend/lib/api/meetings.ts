import { MeetingDetail, TranscriptResponse } from "@/types/meeting";
import { SpeakerResponse, SpeakerMappingRequest } from "@/types/speaker";
import { MeetingIntelligence } from "@/types/intelligence";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errorDetail = "API Request failed";
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export async function getMeeting(id: string): Promise<MeetingDetail> {
  return fetchJson<MeetingDetail>(`${API_BASE_URL}/meetings/${id}`);
}

export async function getTranscript(id: string): Promise<TranscriptResponse> {
  return fetchJson<TranscriptResponse>(`${API_BASE_URL}/meetings/${id}/transcript`);
}

export async function getSpeakers(id: string): Promise<SpeakerResponse[]> {
  return fetchJson<SpeakerResponse[]>(`${API_BASE_URL}/meetings/${id}/speakers`);
}

export async function updateSpeakers(
  id: string,
  payload: SpeakerMappingRequest
): Promise<{ message: string; status: string }> {
  return fetchJson<{ message: string; status: string }>(`${API_BASE_URL}/meetings/${id}/speakers`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getIntelligence(id: string): Promise<MeetingIntelligence> {
  return fetchJson<MeetingIntelligence>(`${API_BASE_URL}/meetings/${id}/intelligence`);
}

export async function updateIntelligence(
  id: string,
  payload: Partial<MeetingIntelligence>
): Promise<MeetingIntelligence> {
  return fetchJson<MeetingIntelligence>(`${API_BASE_URL}/meetings/${id}/intelligence`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function approveMeeting(
  id: string
): Promise<{ message: string; approved_at?: string }> {
  return fetchJson<{ message: string; approved_at?: string }>(`${API_BASE_URL}/meetings/${id}/approve`, {
    method: "POST",
  });
}
