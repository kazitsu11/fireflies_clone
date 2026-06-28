"""Optional AI Q&A endpoints (graceful-degradation behind an env key)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import crud
from ..database import get_db
from ..services import qa

router = APIRouter(prefix="/api", tags=["ai"])


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str


class AiStatus(BaseModel):
    enabled: bool


@router.get("/ai/status", response_model=AiStatus)
def ai_status() -> AiStatus:
    """Whether AI Q&A is available (an LLM key is configured server-side)."""
    return AiStatus(enabled=qa.ai_enabled())


@router.post("/meetings/{meeting_id}/ask", response_model=AskResponse)
def ask_meeting(
    meeting_id: str, body: AskRequest, db: Session = Depends(get_db)
) -> AskResponse:
    if not qa.ai_enabled():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "AI Q&A requires an API key on the server.",
        )
    question = body.question.strip()
    if not question:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Question is required")
    meeting = crud.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    try:
        answer = qa.answer_question(meeting.segments, question)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"AI request failed: {exc}")
    return AskResponse(answer=answer)
