/**
 * Typed fetch client for the FastAPI backend.
 *
 * Base URL comes from NEXT_PUBLIC_API_BASE_URL (set in .env.local), defaulting
 * to the local backend. All methods return parsed, typed JSON and throw
 * `ApiError` on non-2xx responses.
 */

import type {
  ActionItem,
  ActionItemCreateInput,
  ActionItemUpdateInput,
  GlobalSearchHit,
  MeetingCreateInput,
  MeetingDetail,
  MeetingListItem,
  MeetingListParams,
  MeetingUpdateInput,
  Segment,
  TranscriptSearchHit,
  User,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail ?? body);
    } catch {
      /* non-JSON error body — keep statusText */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function toQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  // ---- Misc ----
  getMe: () => request<User>("/api/me"),

  // ---- Meetings ----
  listMeetings: (params: MeetingListParams = {}) =>
    request<MeetingListItem[]>(
      `/api/meetings${toQuery(params as Record<string, unknown>)}`,
    ),

  getMeeting: (id: string) => request<MeetingDetail>(`/api/meetings/${id}`),

  createMeeting: (body: MeetingCreateInput) =>
    request<MeetingDetail>("/api/meetings", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  uploadTranscript: (file: File, fields: { title?: string; description?: string } = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (fields.title) form.append("title", fields.title);
    if (fields.description) form.append("description", fields.description);
    // Let the browser set the multipart boundary — don't send JSON content-type.
    return request<MeetingDetail>("/api/meetings/upload", {
      method: "POST",
      body: form,
      headers: {},
    });
  },

  updateMeeting: (id: string, body: MeetingUpdateInput) =>
    request<MeetingDetail>(`/api/meetings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteMeeting: (id: string) =>
    request<void>(`/api/meetings/${id}`, { method: "DELETE" }),

  regenerateSummary: (id: string) =>
    request<MeetingDetail>(`/api/meetings/${id}/regenerate-summary`, {
      method: "POST",
    }),

  // ---- Transcript / search ----
  getTranscript: (id: string) =>
    request<Segment[]>(`/api/meetings/${id}/transcript`),

  searchTranscript: (id: string, q: string) =>
    request<TranscriptSearchHit[]>(
      `/api/meetings/${id}/transcript/search${toQuery({ q })}`,
      { method: "POST" },
    ),

  globalSearch: (q: string) =>
    request<GlobalSearchHit[]>(`/api/search${toQuery({ q })}`),

  // ---- Action items ----
  listActionItems: (meetingId: string) =>
    request<ActionItem[]>(`/api/meetings/${meetingId}/action-items`),

  createActionItem: (meetingId: string, body: ActionItemCreateInput) =>
    request<ActionItem>(`/api/meetings/${meetingId}/action-items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateActionItem: (itemId: string, body: ActionItemUpdateInput) =>
    request<ActionItem>(`/api/action-items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteActionItem: (itemId: string) =>
    request<void>(`/api/action-items/${itemId}`, { method: "DELETE" }),
};
