"""Transcript and global search endpoints.

  - GET  /api/meetings/{id}/transcript          segments only
  - POST /api/meetings/{id}/transcript/search    matches within one meeting
  - GET  /api/search                             across all titles + transcripts
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["search"])


def _match_offsets(text: str, q: str) -> list[tuple[int, int]]:
    """Character spans of every (case-insensitive) match of `q` in `text`."""
    offsets: list[tuple[int, int]] = []
    haystack, needle = text.lower(), q.lower()
    start = 0
    while needle:
        i = haystack.find(needle, start)
        if i < 0:
            break
        offsets.append((i, i + len(q)))
        start = i + len(q)
    return offsets


def _snippet(text: str, q: str, window: int = 40) -> str:
    """A short excerpt centered on the first match, for global search results."""
    i = text.lower().find(q.lower())
    if i < 0:
        return text[: window * 2] + ("…" if len(text) > window * 2 else "")
    start = max(0, i - window)
    end = min(len(text), i + len(q) + window)
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(text) else ""
    return f"{prefix}{text[start:end]}{suffix}"


@router.get(
    "/meetings/{meeting_id}/transcript",
    response_model=list[schemas.SegmentRead],
    tags=["transcript"],
)
def get_transcript(
    meeting_id: str, db: Session = Depends(get_db)
) -> list[schemas.SegmentRead]:
    if not crud.meeting_exists(db, meeting_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    return crud.get_segments(db, meeting_id)


@router.post(
    "/meetings/{meeting_id}/transcript/search",
    response_model=list[schemas.TranscriptSearchHit],
    tags=["transcript"],
)
def search_transcript(
    meeting_id: str,
    q: str = Query(..., min_length=1, description="Text to find in the transcript"),
    db: Session = Depends(get_db),
) -> list[schemas.TranscriptSearchHit]:
    if not crud.meeting_exists(db, meeting_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    segments = crud.search_transcript(db, meeting_id, q)
    return [
        schemas.TranscriptSearchHit(
            segment_id=s.id,
            idx=s.idx,
            start_ms=s.start_ms,
            speaker=s.speaker,
            text=s.text,
            match_offsets=_match_offsets(s.text, q),
        )
        for s in segments
    ]


@router.get("/search", response_model=list[schemas.GlobalSearchHit])
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> list[schemas.GlobalSearchHit]:
    hits: list[schemas.GlobalSearchHit] = []
    for meeting in crud.search_titles(db, q):
        hits.append(
            schemas.GlobalSearchHit(
                meeting_id=meeting.id,
                meeting_title=meeting.title,
                kind="title",
                snippet=meeting.title,
            )
        )
    for seg in crud.search_segments_global(db, q):
        hits.append(
            schemas.GlobalSearchHit(
                meeting_id=seg.meeting_id,
                meeting_title=seg.meeting.title,
                kind="transcript",
                snippet=_snippet(seg.text, q),
                segment_id=seg.id,
                start_ms=seg.start_ms,
            )
        )
    return hits
