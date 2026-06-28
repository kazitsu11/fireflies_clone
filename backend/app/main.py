"""FastAPI application entry point.

Wires CORS for the Next.js frontend and includes the API routers. Additional
routers (action items, search) are added in Phase 2.
"""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, schemas
from .database import get_db
from .routers import action_items, meetings, search

app = FastAPI(
    title="Fireflies Clone API",
    version="0.1.0",
    description="Meeting-assistant clone backend (mocked STT).",
)

# Allow the local Next.js dev server plus any origins from env (deploy).
_default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
_env_origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _env_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router)
app.include_router(action_items.router)
app.include_router(search.router)

_misc = APIRouter(prefix="/api", tags=["misc"])


@_misc.get("/me", response_model=schemas.UserRead)
def get_me(db: Session = Depends(get_db)) -> schemas.UserRead:
    """Return the single default user (no real auth yet)."""
    return crud.get_or_create_default_user(db)


@_misc.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(_misc)
