"""Pydantic v2 request/response models.

These form the public API contract — ORM objects are never returned directly.
`model_config = ConfigDict(from_attributes=True)` lets us build responses
straight from SQLAlchemy instances.
"""

from __future__ import annotations

import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------- #
# User
# --------------------------------------------------------------------------- #
class UserRead(ORMModel):
    id: str
    name: str
    email: str
    avatar_url: str | None = None
    created_at: datetime


# --------------------------------------------------------------------------- #
# Participant
# --------------------------------------------------------------------------- #
class ParticipantBase(BaseModel):
    name: str
    email: str | None = None
    speaker_label: str | None = None


class ParticipantCreate(ParticipantBase):
    pass


class ParticipantRead(ORMModel, ParticipantBase):
    id: str
    meeting_id: str


# --------------------------------------------------------------------------- #
# Transcript segment
# --------------------------------------------------------------------------- #
class SegmentBase(BaseModel):
    speaker: str
    start_ms: int
    end_ms: int | None = None
    text: str


class SegmentCreate(SegmentBase):
    idx: int | None = None


class SegmentRead(ORMModel, SegmentBase):
    id: str
    meeting_id: str
    idx: int


# --------------------------------------------------------------------------- #
# Summary + chapters
# --------------------------------------------------------------------------- #
class ChapterRead(ORMModel):
    id: str
    title: str
    bullets: list[str] = Field(default_factory=list)
    start_ms: int
    idx: int

    @field_validator("bullets", mode="before")
    @classmethod
    def _parse_bullets(cls, v: object) -> list[str]:
        """ORM stores bullets as a JSON string in `bullets_json`."""
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except json.JSONDecodeError:
                return []
        if isinstance(v, list):
            return v
        return []

    @classmethod
    def from_orm_chapter(cls, chapter) -> "ChapterRead":
        return cls(
            id=chapter.id,
            title=chapter.title,
            bullets=cls._parse_bullets(chapter.bullets_json),
            start_ms=chapter.start_ms,
            idx=chapter.idx,
        )


class SummaryRead(ORMModel):
    id: str
    overview: str
    generated_by: str
    chapters: list[ChapterRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# --------------------------------------------------------------------------- #
# Keyword
# --------------------------------------------------------------------------- #
class KeywordRead(ORMModel):
    id: str
    term: str


# --------------------------------------------------------------------------- #
# Action items
# --------------------------------------------------------------------------- #
class ActionItemBase(BaseModel):
    text: str
    assignee: str | None = None
    completed: bool = False
    start_ms: int | None = None


class ActionItemCreate(ActionItemBase):
    pass


class ActionItemUpdate(BaseModel):
    text: str | None = None
    assignee: str | None = None
    completed: bool | None = None
    start_ms: int | None = None


class ActionItemRead(ORMModel, ActionItemBase):
    id: str
    meeting_id: str
    created_at: datetime
    updated_at: datetime


# --------------------------------------------------------------------------- #
# Meetings
# --------------------------------------------------------------------------- #
class MeetingBase(BaseModel):
    title: str
    description: str | None = None
    date: datetime | None = None
    duration_seconds: int = 0
    audio_url: str | None = None
    language: str = "en"


class MeetingCreate(MeetingBase):
    """Create a meeting from a manual form or pre-parsed transcript."""

    participants: list[ParticipantCreate] = Field(default_factory=list)
    segments: list[SegmentCreate] = Field(default_factory=list)
    # Raw transcript text the server should parse (alternative to `segments`).
    transcript_text: str | None = None
    transcript_format: str | None = None  # 'txt' | 'vtt' | 'json'
    generate_summary: bool = True


class MeetingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    date: datetime | None = None
    duration_seconds: int | None = None
    audio_url: str | None = None
    language: str | None = None
    participants: list[ParticipantCreate] | None = None


class MeetingListItem(ORMModel):
    """Lightweight row for the dashboard list."""

    id: str
    title: str
    date: datetime
    duration_seconds: int
    language: str
    created_at: datetime
    participants: list[ParticipantRead] = Field(default_factory=list)
    action_item_count: int = 0
    keywords: list[KeywordRead] = Field(default_factory=list)


class MeetingDetail(ORMModel):
    """Full aggregation for the notepad detail page."""

    id: str
    title: str
    description: str | None = None
    date: datetime
    duration_seconds: int
    audio_url: str | None = None
    language: str
    organizer: UserRead | None = None
    created_at: datetime
    updated_at: datetime
    participants: list[ParticipantRead] = Field(default_factory=list)
    segments: list[SegmentRead] = Field(default_factory=list)
    summary: SummaryRead | None = None
    keywords: list[KeywordRead] = Field(default_factory=list)
    action_items: list[ActionItemRead] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Search
# --------------------------------------------------------------------------- #
class TranscriptSearchHit(BaseModel):
    segment_id: str
    idx: int
    start_ms: int
    speaker: str
    text: str
    # character offsets of matches within `text`
    match_offsets: list[tuple[int, int]] = Field(default_factory=list)


class GlobalSearchHit(BaseModel):
    meeting_id: str
    meeting_title: str
    kind: str  # 'title' | 'transcript'
    snippet: str
    segment_id: str | None = None
    start_ms: int | None = None
