"""Action-item endpoints.

Meeting-scoped collection routes live under /api/meetings/{id}/action-items;
item-scoped mutations live under /api/action-items/{id}.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["action-items"])


@router.get(
    "/meetings/{meeting_id}/action-items",
    response_model=list[schemas.ActionItemRead],
)
def list_action_items(
    meeting_id: str, db: Session = Depends(get_db)
) -> list[schemas.ActionItemRead]:
    if not crud.meeting_exists(db, meeting_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    return crud.list_action_items(db, meeting_id)


@router.post(
    "/meetings/{meeting_id}/action-items",
    response_model=schemas.ActionItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_action_item(
    meeting_id: str,
    payload: schemas.ActionItemCreate,
    db: Session = Depends(get_db),
) -> schemas.ActionItemRead:
    if not crud.meeting_exists(db, meeting_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    return crud.create_action_item(db, meeting_id, payload)


@router.patch("/action-items/{item_id}", response_model=schemas.ActionItemRead)
def update_action_item(
    item_id: str,
    payload: schemas.ActionItemUpdate,
    db: Session = Depends(get_db),
) -> schemas.ActionItemRead:
    item = crud.get_action_item(db, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action item not found")
    return crud.update_action_item(db, item, payload)


@router.delete("/action-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action_item(item_id: str, db: Session = Depends(get_db)) -> Response:
    item = crud.get_action_item(db, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action item not found")
    crud.delete_action_item(db, item)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
