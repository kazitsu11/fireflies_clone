"""Database operations, kept out of the route handlers.

Routes stay thin: they validate input, call these functions, and shape errors.
The `build_*` helpers translate ORM graphs into Pydantic response models so we
never leak ORM objects across the API boundary.
"""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from . import models, schemas


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
def get_or_create_default_user(db: Session) -> models.User:
    """The app assumes a single logged-in user (see CLAUDE.md §2.5)."""
    user = db.scalar(select(models.User).limit(1))
    if user is None:
        user = models.User(
            name="Demo User",
            email="demo@fireflies.local",
            avatar_url=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# --------------------------------------------------------------------------- #
# Response builders
# --------------------------------------------------------------------------- #
def build_summary(summary: models.Summary | None) -> schemas.SummaryRead | None:
    if summary is None:
        return None
    return schemas.SummaryRead(
        id=summary.id,
        overview=summary.overview,
        generated_by=summary.generated_by,
        chapters=[
            schemas.ChapterRead.from_orm_chapter(c) for c in summary.chapters
        ],
        created_at=summary.created_at,
        updated_at=summary.updated_at,
    )


def build_detail(meeting: models.Meeting) -> schemas.MeetingDetail:
    return schemas.MeetingDetail(
        id=meeting.id,
        title=meeting.title,
        description=meeting.description,
        date=meeting.date,
        duration_seconds=meeting.duration_seconds,
        audio_url=meeting.audio_url,
        language=meeting.language,
        organizer=meeting.organizer,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        participants=meeting.participants,
        segments=meeting.segments,
        summary=build_summary(meeting.summary),
        keywords=meeting.keywords,
        action_items=meeting.action_items,
    )


def build_list_item(meeting: models.Meeting) -> schemas.MeetingListItem:
    return schemas.MeetingListItem(
        id=meeting.id,
        title=meeting.title,
        date=meeting.date,
        duration_seconds=meeting.duration_seconds,
        language=meeting.language,
        created_at=meeting.created_at,
        participants=meeting.participants,
        action_item_count=len(meeting.action_items),
        keywords=meeting.keywords,
    )


# --------------------------------------------------------------------------- #
# Meeting queries
# --------------------------------------------------------------------------- #
_DETAIL_LOADERS = (
    selectinload(models.Meeting.participants),
    selectinload(models.Meeting.segments),
    selectinload(models.Meeting.keywords),
    selectinload(models.Meeting.action_items),
    selectinload(models.Meeting.organizer),
    selectinload(models.Meeting.summary).selectinload(models.Summary.chapters),
)


def get_meeting(db: Session, meeting_id: str) -> models.Meeting | None:
    stmt = (
        select(models.Meeting)
        .where(models.Meeting.id == meeting_id)
        .options(*_DETAIL_LOADERS)
    )
    return db.scalar(stmt)


def list_meetings(
    db: Session,
    *,
    q: str | None = None,
    participant: str | None = None,
    date_from=None,
    date_to=None,
    min_duration: int | None = None,
    sort: str = "recent",
) -> list[models.Meeting]:
    stmt = select(models.Meeting).options(
        selectinload(models.Meeting.participants),
        selectinload(models.Meeting.keywords),
        selectinload(models.Meeting.action_items),
    )

    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(models.Meeting.title.ilike(like))
    if participant:
        stmt = stmt.where(
            models.Meeting.participants.any(
                models.Participant.name.ilike(f"%{participant}%")
            )
        )
    if date_from is not None:
        stmt = stmt.where(models.Meeting.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(models.Meeting.date <= date_to)
    if min_duration is not None:
        stmt = stmt.where(models.Meeting.duration_seconds >= min_duration)

    if sort == "oldest":
        stmt = stmt.order_by(models.Meeting.date.asc())
    elif sort == "longest":
        stmt = stmt.order_by(models.Meeting.duration_seconds.desc())
    elif sort == "title":
        stmt = stmt.order_by(models.Meeting.title.asc())
    else:  # "recent" (default)
        stmt = stmt.order_by(models.Meeting.date.desc())

    return list(db.scalars(stmt).all())


# --------------------------------------------------------------------------- #
# Meeting mutations
# --------------------------------------------------------------------------- #
def create_meeting(
    db: Session,
    payload: schemas.MeetingCreate,
    *,
    segments: list[schemas.SegmentCreate] | None = None,
    organizer_id: str | None = None,
) -> models.Meeting:
    """Create a meeting plus its participants and transcript segments.

    `segments` (already parsed) takes precedence over `payload.segments` so the
    upload route can hand in server-parsed segments. Summary/keyword generation
    is wired in Phase 2.
    """
    meeting = models.Meeting(
        title=payload.title,
        description=payload.description,
        duration_seconds=payload.duration_seconds,
        audio_url=payload.audio_url,
        language=payload.language,
        organizer_id=organizer_id,
    )
    if payload.date is not None:
        meeting.date = payload.date

    for p in payload.participants:
        meeting.participants.append(
            models.Participant(
                name=p.name, email=p.email, speaker_label=p.speaker_label
            )
        )

    seg_source = segments if segments is not None else payload.segments
    for i, seg in enumerate(seg_source):
        meeting.segments.append(
            models.TranscriptSegment(
                speaker=seg.speaker,
                start_ms=seg.start_ms,
                end_ms=seg.end_ms,
                text=seg.text,
                idx=seg.idx if seg.idx is not None else i,
            )
        )

    # Derive duration from the last segment if the caller didn't supply one.
    if not meeting.duration_seconds and meeting.segments:
        last = max(meeting.segments, key=lambda s: s.start_ms)
        end = last.end_ms if last.end_ms is not None else last.start_ms
        meeting.duration_seconds = end // 1000

    db.add(meeting)
    db.commit()
    return get_meeting(db, meeting.id)


def update_meeting(
    db: Session, meeting: models.Meeting, payload: schemas.MeetingUpdate
) -> models.Meeting:
    data = payload.model_dump(exclude_unset=True)
    participants = data.pop("participants", None)

    for field, value in data.items():
        setattr(meeting, field, value)

    if participants is not None:
        # Replace the participant set wholesale; cascade removes the old rows.
        meeting.participants.clear()
        for p in participants:
            meeting.participants.append(models.Participant(**p))

    db.commit()
    return get_meeting(db, meeting.id)


def delete_meeting(db: Session, meeting: models.Meeting) -> None:
    db.delete(meeting)
    db.commit()


def replace_summary(
    db: Session,
    meeting: models.Meeting,
    *,
    overview: str,
    generated_by: str,
    keywords: list[str],
    chapters: list[dict],
    action_items: list[dict],
) -> None:
    """Replace a meeting's summary, keywords, and action items in place.

    Used by the summarizer / regenerate endpoint (Phase 2). Kept here so all
    persistence lives in crud.
    """
    if meeting.summary is not None:
        db.delete(meeting.summary)
        db.flush()

    summary = models.Summary(
        meeting_id=meeting.id,
        overview=overview,
        generated_by=generated_by,
    )
    for i, ch in enumerate(chapters):
        summary.chapters.append(
            models.SummaryChapter(
                title=ch.get("title", f"Chapter {i + 1}"),
                bullets_json=json.dumps(ch.get("bullets", [])),
                start_ms=ch.get("start_ms", 0),
                idx=i,
            )
        )
    db.add(summary)

    meeting.keywords.clear()
    for term in keywords:
        meeting.keywords.append(models.Keyword(term=term))

    meeting.action_items.clear()
    for ai in action_items:
        meeting.action_items.append(
            models.ActionItem(
                text=ai.get("text", ""),
                assignee=ai.get("assignee"),
                start_ms=ai.get("start_ms"),
                completed=ai.get("completed", False),
            )
        )

    db.commit()


def meeting_exists(db: Session, meeting_id: str) -> bool:
    return db.get(models.Meeting, meeting_id) is not None


# --------------------------------------------------------------------------- #
# Transcript / search
# --------------------------------------------------------------------------- #
def get_segments(db: Session, meeting_id: str) -> list[models.TranscriptSegment]:
    stmt = (
        select(models.TranscriptSegment)
        .where(models.TranscriptSegment.meeting_id == meeting_id)
        .order_by(models.TranscriptSegment.idx)
    )
    return list(db.scalars(stmt).all())


def search_transcript(
    db: Session, meeting_id: str, q: str
) -> list[models.TranscriptSegment]:
    stmt = (
        select(models.TranscriptSegment)
        .where(
            models.TranscriptSegment.meeting_id == meeting_id,
            models.TranscriptSegment.text.ilike(f"%{q}%"),
        )
        .order_by(models.TranscriptSegment.idx)
    )
    return list(db.scalars(stmt).all())


def search_titles(db: Session, q: str) -> list[models.Meeting]:
    stmt = (
        select(models.Meeting)
        .where(models.Meeting.title.ilike(f"%{q}%"))
        .order_by(models.Meeting.date.desc())
    )
    return list(db.scalars(stmt).all())


def search_segments_global(
    db: Session, q: str, limit: int = 50
) -> list[models.TranscriptSegment]:
    stmt = (
        select(models.TranscriptSegment)
        .where(models.TranscriptSegment.text.ilike(f"%{q}%"))
        .options(selectinload(models.TranscriptSegment.meeting))
        .order_by(models.TranscriptSegment.meeting_id, models.TranscriptSegment.idx)
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


# --------------------------------------------------------------------------- #
# Action items
# --------------------------------------------------------------------------- #
def list_action_items(db: Session, meeting_id: str) -> list[models.ActionItem]:
    stmt = (
        select(models.ActionItem)
        .where(models.ActionItem.meeting_id == meeting_id)
        .order_by(models.ActionItem.created_at)
    )
    return list(db.scalars(stmt).all())


def get_action_item(db: Session, item_id: str) -> models.ActionItem | None:
    return db.get(models.ActionItem, item_id)


def create_action_item(
    db: Session, meeting_id: str, payload: schemas.ActionItemCreate
) -> models.ActionItem:
    item = models.ActionItem(meeting_id=meeting_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_action_item(
    db: Session, item: models.ActionItem, payload: schemas.ActionItemUpdate
) -> models.ActionItem:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def delete_action_item(db: Session, item: models.ActionItem) -> None:
    db.delete(item)
    db.commit()
