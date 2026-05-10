from sqlmodel import SQLModel, create_engine, Session
from config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    echo=False,
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


def get_session_sync() -> Session:
    """Para uso en jobs (fuera de FastAPI)."""
    return Session(engine)
