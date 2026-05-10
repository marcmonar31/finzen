from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite:///./data/finzen.db"
    ENVIRONMENT: str = "local"  # "local" | "produccion"

    # Supabase (requerido en ENVIRONMENT=produccion)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None

    # Email (opcional, para invitaciones a workspace)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: str = "noreply@finzen.app"

    @property
    def is_local(self) -> bool:
        return self.ENVIRONMENT == "local"


settings = Settings()
