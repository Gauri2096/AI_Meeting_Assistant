import { MeetingDetail, TranscriptResponse, MeetingListItem } from "@/types/meeting";
import { SpeakerResponse, SpeakerMappingRequest } from "@/types/speaker";
import { MeetingIntelligence } from "@/types/intelligence";
import { UserResponse } from "@/types/user";
import { getToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface RegisterPayload {
  bank_emp_id: string;
  name: string;
  email: string;
  password: string;
  designation?: string;
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const defaultOptions: RequestInit = {
    ...options,
    headers,
  };

  const res = await fetch(url, defaultOptions);
  if (!res.ok) {
    let errorDetail = "API Request failed";
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch (_) { }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

// Authentication APIs
export async function loginUser(
  username: string,
  password: string
): Promise<{ message: string; access_token: string; token_type: string }> {
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);

  return fetchJson<{ message: string; access_token: string; token_type: string }>(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
}

export async function registerUser(payload: RegisterPayload): Promise<{ id: string; email: string }> {
  return fetchJson<{ id: string; email: string }>(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(): Promise<UserResponse> {
  return fetchJson<UserResponse>(`${API_BASE_URL}/auth/me`);
}


// Meeting and Transcript APIs
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
  payload: Partial<MeetingIntelligence> & { title?: string }
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

export async function uploadMeetingFile(formData: FormData): Promise<{ id: string; status?: string }> {
  return fetchJson<{ id: string; status?: string }>(`${API_BASE_URL}/meetings/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function downloadMeetingPdf(id: string): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}/meetings/${id}/pdf`, {
    headers,
  });
  if (!res.ok) {
    let errorDetail = "Failed to download PDF";
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch (_) { }
    throw new Error(errorDetail);
  }
  return res.blob();
}

export async function sendMeetingEmail(id: string, recipients: string[]): Promise<{ message: string }> {
  return fetchJson<{ message: string }>(`${API_BASE_URL}/meetings/${id}/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipients }),
  });
}

export async function listMeetings(): Promise<MeetingListItem[]> {
  return fetchJson<MeetingListItem[]>(`${API_BASE_URL}/meetings`);
}

export async function retryTranscription(id: string): Promise<{ message: string }> {
  return fetchJson<{ message: string }>(`${API_BASE_URL}/meetings/${id}/retry-transcription`, {
    method: "POST",
  });
}
