from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 15} if "sqlite" in DATABASE_URL else {}
)

if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_con, connection_record):
        cursor = dbapi_con.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=DELETE;")
            cursor.execute("PRAGMA busy_timeout=15000;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
        except Exception:
            pass
        finally:
            cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
