"""SQLAlchemy ORM models.

Schema (see CLAUDE.md §3):
  - A meeting has many transcript_segments, participants, keywords, action_items.
  - A meeting has exactly one summary (1:1); a summary has many chapters.
  - Cascades clean up all children when a meeting (or summary) is deleted.

UUID string PKs keep ids opaque and avoid leaking row counts.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    meetings: Mapped[list["Meeting"]] = relationship(
        back_populates="organizer",
    )


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    audio_url: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str] = mapped_column(String, nullable=False, default="en")
    organizer_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_now, onupdate=_now
    )

    organizer: Mapped[User | None] = relationship(back_populates="meetings")
    participants: Mapped[list["Participant"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="Participant.id",
    )
    segments: Mapped[list["TranscriptSegment"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.idx",
    )
    summary: Mapped["Summary | None"] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        uselist=False,
    )
    keywords: Mapped[list["Keyword"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="Keyword.id",
    )
    action_items: Mapped[list["ActionItem"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="ActionItem.created_at",
    )


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    meeting_id: Mapped[str] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    # Maps a transcript speaker (e.g. "Speaker 1") to this participant.
    speaker_label: Mapped[str | None] = mapped_column(String, nullable=True)

    meeting: Mapped[Meeting] = relationship(back_populates="participants")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    # Ordered scans within a meeting hit this composite index.
    __table_args__ = (Index("ix_segments_meeting_idx", "meeting_id", "idx"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    meeting_id: Mapped[str] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    speaker: Mapped[str] = mapped_column(String, nullable=False)
    start_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    end_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    idx: Mapped[int] = mapped_column(Integer, nullable=False)

    meeting: Mapped[Meeting] = relationship(back_populates="segments")


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    meeting_id: Mapped[str] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # enforce 1:1
        index=True,
    )
    overview: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_by: Mapped[str] = mapped_column(String, nullable=False, default="seed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_now, onupdate=_now
    )

    meeting: Mapped[Meeting] = relationship(back_populates="summary")
    chapters: Mapped[list["SummaryChapter"]] = relationship(
        back_populates="summary",
        cascade="all, delete-orphan",
        order_by="SummaryChapter.idx",
    )


class SummaryChapter(Base):
    __tablename__ = "summary_chapters"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    summary_id: Mapped[str] = mapped_column(
        ForeignKey("summaries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    # JSON-encoded array of bullet strings.
    bullets_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    start_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    idx: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    summary: Mapped[Summary] = relationship(back_populates="chapters")


class Keyword(Base):
    __tablename__ = "keywords"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    meeting_id: Mapped[str] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    term: Mapped[str] = mapped_column(String, nullable=False)

    meeting: Mapped[Meeting] = relationship(back_populates="keywords")


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    meeting_id: Mapped[str] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    assignee: Mapped[str | None] = mapped_column(String, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    start_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_now, onupdate=_now
    )

    meeting: Mapped[Meeting] = relationship(back_populates="action_items")
