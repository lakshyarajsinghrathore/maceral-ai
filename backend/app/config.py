import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API Keys
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # Supabase (Optional - will use SQLite locally if not provided)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # JWT Auth
    JWT_SECRET_KEY: str = "coal-intelligence-platform-secret-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # App Settings
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000"

    # Storage & DB
    DATABASE_URL: str = "sqlite:///./coal_intelligence.db"
    UPLOAD_DIR: str = "./uploads"
    GENERATED_REPORTS_DIR: str = "./generated_reports"

    @property
    def sync_database_url(self) -> str:
        """Ensure PostgreSQL connection strings use postgresql:// for SQLAlchemy."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def cors_origin_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        extra = "allow"

settings = Settings()

# Ensure required local directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.GENERATED_REPORTS_DIR, exist_ok=True)

