"""Database engine, session factory, and the declarative Base.

We use SQLite with a file living next to the app (`backend/fireflies.db`).
`check_same_thread=False` is required because FastAPI may use the connection
from different threads across requests.
"""

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# fireflies.db sits at backend/fireflies.db (two parents up from this file).
BACKEND_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = f"sqlite:///{BACKEND_DIR / 'fireflies.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""


@event.listens_for(Engine, "connect")
def _enable_sqlite_fk(dbapi_connection, _connection_record) -> None:
    """SQLite ignores foreign keys (and thus cascades) unless we opt in."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
