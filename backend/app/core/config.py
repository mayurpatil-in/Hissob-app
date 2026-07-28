import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "Hissob ERP"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me"

    # Database
    DATABASE_URL: str = "postgresql://hissob_user:hissob_pass@localhost:5432/hissob_dev"

    # JWT
    JWT_SECRET_KEY: str = "change-me-jwt"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # Uploads
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Super Admin Seed
    SUPER_ADMIN_EMAIL: str = "admin@hisob.in"
    SUPER_ADMIN_PASSWORD: str = "ChangeMe@396"


settings = Settings()
