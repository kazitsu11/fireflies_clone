"""Meeting endpoints: list, detail, create (JSON or upload), update, delete.

Two create paths share the same persistence:
  - POST /api/meetings         JSON body; supports inline `segments` OR a
                               pasted `transcript_text` that we parse server-side.
  - POST /api/meetings/upload  multipart file upload (.txt/.vtt/.json) that we
                               parse server-side into segments.

FastAPI can't cleanly accept both JSON and multipart on a single path operation
(they're different content types), so the file upload gets its own endpoint.
"""

from __future__ import annotations

import os
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..services import transcript_parser

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB cap on transcript uploads


def _segments_from_parsed(parsed: list[dict]) -> list[schemas.SegmentCreate]:
    """Parser dicts -> SegmentCreate (idx already assigned by the parser)."""
    return [schemas.SegmentCreate(**seg) for seg in parsed]


@router.get("", response_model=list[schemas.MeetingListItem])
def list_meetings(
    q: str | None = Query(None, description="Search by title"),
    participant: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    min_duration: int | None = Query(None, ge=0),
    sort: str = Query("recent", pattern="^(recent|oldest|longest|title)$"),
    db: Session = Depends(get_db),
) -> list[schemas.MeetingListItem]:
    meetings = crud.list_meetings(
        db,
        q=q,
        participant=participant,
        date_from=date_from,
        date_to=date_to,
        min_duration=min_duration,
        sort=sort,
    )
    return [crud.build_list_item(m) for m in meetings]


@router.get("/{meeting_id}", response_model=schemas.MeetingDetail)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)) -> schemas.MeetingDetail:
    meeting = crud.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    return crud.build_detail(meeting)


@router.post(
    "", response_model=schemas.MeetingDetail, status_code=status.HTTP_201_CREATED
)
def create_meeting(
    payload: schemas.MeetingCreate, db: Session = Depends(get_db)
) -> schemas.MeetingDetail:
    user = crud.get_or_create_default_user(db)

    segments: list[schemas.SegmentCreate] | None = None
    if payload.transcript_text:
        fmt = payload.transcript_format or "txt"
        try:
            parsed = transcript_parser.parse_transcript(payload.transcript_text, fmt)
        except Exception as exc:  # noqa: BLE001 - surface parse errors as 422, not 500
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Could not parse transcript: {exc}",
            )
        segments = _segments_from_parsed(parsed)

    meeting = crud.create_meeting(
        db, payload, segments=segments, organizer_id=user.id
    )
    return crud.build_detail(meeting)


@router.post(
    "/upload",
    response_model=schemas.MeetingDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_meeting_from_upload(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    description: str | None = Form(None),
    db: Session = Depends(get_db),
) -> schemas.MeetingDetail:
    # Validate extension first (cheap, before reading the body).
    try:
        fmt = transcript_parser.detect_format(file.filename or "")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )

    content = raw.decode("utf-8", errors="replace")
    try:
        parsed = transcript_parser.parse_transcript(content, fmt)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"Could not parse transcript: {exc}"
        )
    if not parsed:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Transcript produced no segments",
        )

    user = crud.get_or_create_default_user(db)
    fallback_title = os.path.splitext(file.filename or "Untitled meeting")[0]
    payload = schemas.MeetingCreate(
        title=title or fallback_title,
        description=description,
        audio_url="/sample-audio.mp3",
    )
    meeting = crud.create_meeting(
        db, payload, segments=_segments_from_parsed(parsed), organizer_id=user.id
    )
    return crud.build_detail(meeting)


@router.patch("/{meeting_id}", response_model=schemas.MeetingDetail)
def update_meeting(
    meeting_id: str,
    payload: schemas.MeetingUpdate,
    db: Session = Depends(get_db),
) -> schemas.MeetingDetail:
    meeting = crud.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    meeting = crud.update_meeting(db, meeting, payload)
    return crud.build_detail(meeting)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting_id: str, db: Session = Depends(get_db)) -> Response:
    meeting = crud.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    crud.delete_meeting(db, meeting)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
