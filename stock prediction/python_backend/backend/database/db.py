"""SQLAlchemy engine + session factory."""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.utils.config import settings
from backend.utils.logger import logger

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, echo=False, future=True, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


def init_db() -> None:
    """Create tables if they don't exist."""
    from backend.database import models  # noqa: F401  (registers models)
    logger.info(f"Initializing database: {settings.DATABASE_URL}")
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency for a scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--init", action="store_true")
    args = p.parse_args()
    if args.init:
        init_db()
        print("✅ Database initialized.")
