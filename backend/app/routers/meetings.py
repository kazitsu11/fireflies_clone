"""Meeting endpoints: list, detail, create, update, delete.

Upload-based create, transcript search, and regenerate-summary are layered on
in Phase 2; the JSON create path and full CRUD live here.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


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
    meeting = crud.create_meeting(db, payload, organizer_id=user.id)
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
