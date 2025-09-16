from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator
import os
from pathlib import Path

class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "Homestay Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: Optional[str] = None  # JWT secret for verifying tokens
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # Cloudflare R2
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY: Optional[str] = None
    R2_SECRET_KEY: Optional[str] = None
    R2_BUCKET_NAME: str = "homestay-images"
    R2_PUBLIC_URL: Optional[str] = None
    R2_ENDPOINT_URL: Optional[str] = None
    
    @validator("R2_ENDPOINT_URL", pre=True, always=True)
    def set_r2_endpoint(cls, v, values):
        if not v and values.get("R2_ACCOUNT_ID"):
            return f"https://{values['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com"
        return v
    
    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@homestay.com"
    SMTP_TLS: bool = True
    
    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # JWT Settings for Production
    JWT_JWKS_URL: Optional[str] = None
    JWT_AUD: str = "authenticated"
    JWT_ISS: Optional[str] = None
    JWT_ALGORITHM: str = "RS256"
    JWT_VERIFY_SIGNATURE: bool = True
    JWT_LEEWAY: int = 120  # 2 minutes clock skew tolerance
    
    @validator("JWT_JWKS_URL", pre=True, always=True)
    def set_jwt_jwks_url(cls, v, values):
        if not v and values.get("SUPABASE_URL"):
            return f"{values['SUPABASE_URL']}/auth/v1/jwks"
        return v
        
    @validator("JWT_ISS", pre=True, always=True)
    def set_jwt_issuer(cls, v, values):
        if not v and values.get("SUPABASE_URL"):
            return f"{values['SUPABASE_URL']}/auth/v1"
        return v
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000"
    ]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return []
    
    # Database
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 0
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Sentry Configuration
    SENTRY_DSN: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_PROFILES_SAMPLE_RATE: float = 0.1
    SENTRY_ENVIRONMENT: str = "development"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"]
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"  # Allow extra fields in .env
        
        # Load development overrides if they exist
        @classmethod
        def customise_sources(
            cls,
            init_settings,
            env_settings,
            file_secret_settings,
        ):
            return (
                init_settings,
                env_settings,
                file_secret_settings,
            )

# Create global settings instance
settings = Settings()
