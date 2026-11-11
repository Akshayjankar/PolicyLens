"""SQLAlchemy database setup for PolicyLens — uses SQLite (no server required)."""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Default to a local SQLite file next to this script
_default_db = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'policylens.db')}"
DATABASE_URL = os.getenv("DATABASE_URL", _default_db)

# SQLite needs check_same_thread=False when used with FastAPI
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a DB session and ensures it is closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
