/**
 * TypeScript mirrors of the backend Pydantic response models.
 * Keep in sync with backend/app/schemas.py.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  meeting_id: string;
  name: string;
  email: string | null;
  speaker_label: string | null;
}

export interface Segment {
  id: string;
  meeting_id: string;
  speaker: string;
  start_ms: number;
  end_ms: number | null;
  text: string;
  idx: number;
}

export interface Chapter {
  id: string;
  title: string;
  bullets: string[];
  start_ms: number;
  idx: number;
}

export interface Summary {
  id: string;
  overview: string;
  generated_by: "seed" | "llm";
  chapters: Chapter[];
  created_at: string;
  updated_at: string;
}

export interface Keyword {
  id: string;
  term: string;
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  text: string;
  assignee: string | null;
  completed: boolean;
  start_ms: number | null;
  created_at: string;
  updated_at: string;
}

/** Row returned by GET /api/meetings (lightweight). */
export interface MeetingListItem {
  id: string;
  title: string;
  date: string;
  duration_seconds: number;
  language: string;
  created_at: string;
  participants: Participant[];
  action_item_count: number;
  keywords: Keyword[];
}

/** Full aggregation from GET /api/meetings/{id}. */
export interface MeetingDetail {
  id: string;
  title: string;
  description: string | null;
  date: string;
  duration_seconds: number;
  audio_url: string | null;
  language: string;
  organizer: User | null;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  segments: Segment[];
  summary: Summary | null;
  keywords: Keyword[];
  action_items: ActionItem[];
}

export interface TranscriptSearchHit {
  segment_id: string;
  idx: number;
  start_ms: number;
  speaker: string;
  text: string;
  match_offsets: [number, number][];
}

export interface GlobalSearchHit {
  meeting_id: string;
  meeting_title: string;
  kind: "title" | "transcript";
  snippet: string;
  segment_id: string | null;
  start_ms: number | null;
}

// ---- Request payloads ----

export interface MeetingListParams {
  q?: string;
  participant?: string;
  keyword?: string;
  date_from?: string;
  date_to?: string;
  min_duration?: number;
  sort?: "recent" | "oldest" | "longest" | "title";
}

export interface ParticipantInput {
  name: string;
  email?: string | null;
  speaker_label?: string | null;
}

export interface MeetingCreateInput {
  title: string;
  description?: string | null;
  date?: string | null;
  duration_seconds?: number;
  audio_url?: string | null;
  language?: string;
  participants?: ParticipantInput[];
  transcript_text?: string | null;
  transcript_format?: "txt" | "vtt" | "json" | null;
  generate_summary?: boolean;
}

export interface MeetingUpdateInput {
  title?: string;
  description?: string | null;
  date?: string | null;
  duration_seconds?: number;
  audio_url?: string | null;
  language?: string;
  participants?: ParticipantInput[];
}

export interface ActionItemCreateInput {
  text: string;
  assignee?: string | null;
  completed?: boolean;
  start_ms?: number | null;
}

export interface ActionItemUpdateInput {
  text?: string;
  assignee?: string | null;
  completed?: boolean;
  start_ms?: number | null;
}
