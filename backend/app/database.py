import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .config import settings
from .models.db_models import Base

# Database Engine setup (SQLite local by default, or Postgres if DATABASE_URL is set)
db_url = settings.sync_database_url
engine_kwargs = {}
if "sqlite" in db_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Resilience for cloud PostgreSQL (Supabase / Render)
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

# Optional Supabase Client initialization
supabase_client = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        print(" Connected to Supabase Project successfully!")
    except Exception as e:
        print(f"⚠️ Supabase init warning (falling back to SQLite): {e}")

def init_db():
    """Create tables in local SQLite / PostgreSQL"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """FastAPI Dependency for database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
