"""
CodeMate AI — Core Configuration Management
Loads configuration from environment variables and .env file using Pydantic Settings.
"""

from typing import Any, List, Optional
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service Info
    SERVICE_NAME: str = "CodeMate AI Backend"
    SERVICE_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", description="Runtime environment (development, test, production)")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    # Server Bindings
    BACKEND_HOST: str = Field(default="127.0.0.1", description="Server bind host")
    BACKEND_PORT: int = Field(default=8000, description="Server bind port")

    # Security & CORS
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,https://codemate-web.vercel.app",
        description="Comma-separated allowed CORS origins",
    )
    FRONTEND_URL: str = Field(
        default="https://codemate-web.vercel.app",
        description="Frontend Next.js application URL",
    )
    MAX_REQUEST_SIZE_BYTES: int = Field(
        default=1_048_576, description="Max allowed request payload size in bytes (1MB default)"
    )
    RATE_LIMIT_PER_MINUTE: int = Field(default=60, description="Maximum requests per client per minute")

    # AI Provider Configuration
    AI_PROVIDER: str = Field(
        default="gemini",
        description="Active AI Provider: 'gemini', 'openai', 'openrouter'",
    )
    DEFAULT_AI_PROVIDER: str = Field(
        default="gemini",
        description="Default AI Provider fallback",
    )
    AI_MODEL: str = Field(default="gemini-3.5-flash", description="Target model name")
    AI_API_KEY: Optional[str] = Field(default=None, description="API Key for the chosen provider")
    AI_BASE_URL: Optional[str] = Field(default=None, description="Custom API Base URL if applicable")
    GEMINI_API_KEY: Optional[str] = Field(default=None, description="Google Gemini API Key")
    GEMINI_MODEL: Optional[str] = Field(default="gemini-3.5-flash", description="Google Gemini model name")
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API Key")
    OPENAI_MODEL: Optional[str] = Field(default=None, description="OpenAI model name")
    OPENROUTER_API_KEY: Optional[str] = Field(default=None, description="OpenRouter API Key")
    OPENROUTER_MODEL: Optional[str] = Field(default="meta-llama/llama-3.3-70b-instruct", description="OpenRouter model")
    OPENROUTER_BASE_URL: Optional[str] = Field(default="https://openrouter.ai/api/v1", description="OpenRouter API Base URL")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, description="Anthropic Claude API Key")
    ANTHROPIC_MODEL: Optional[str] = Field(default="claude-3-5-sonnet-20241022", description="Claude model")
    ANTHROPIC_BASE_URL: Optional[str] = Field(default="https://api.anthropic.com/v1", description="Claude API Base URL")
    DEEPSEEK_API_KEY: Optional[str] = Field(default=None, description="DeepSeek API Key")
    DEEPSEEK_MODEL: Optional[str] = Field(default="deepseek-chat", description="DeepSeek model")
    DEEPSEEK_BASE_URL: Optional[str] = Field(default="https://api.deepseek.com/v1", description="DeepSeek Base URL")
    XAI_API_KEY: Optional[str] = Field(default=None, description="xAI Grok API Key")
    XAI_MODEL: Optional[str] = Field(default="grok-2", description="Grok model")
    XAI_BASE_URL: Optional[str] = Field(default="https://api.x.ai/v1", description="xAI Base URL")
    AI_TEMPERATURE: float = Field(default=0.2, ge=0.0, le=1.0, description="Model generation temperature")
    AI_MAX_OUTPUT_TOKENS: int = Field(default=4096, ge=256, le=16384, description="Max output tokens")
    AI_TIMEOUT_SECONDS: float = Field(default=60.0, ge=5.0, le=120.0, description="HTTP request timeout in seconds")
    AI_MAX_RETRIES: int = Field(default=2, ge=0, le=5, description="Max retry attempts on transient network error")

    # Phase 6: Persistence & Database (SQLite dev fallback, PostgreSQL in production)
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./codemate.db",
        description="Async SQLAlchemy database connection URL"
    )
    SYNC_DATABASE_URL: str = Field(
        default="sqlite:///./codemate.db",
        description="Sync database connection URL for Alembic migrations"
    )
    DB_POOL_SIZE: int = Field(default=20, ge=5, le=100, description="PostgreSQL connection pool size")
    DB_MAX_OVERFLOW: int = Field(default=10, ge=0, le=50, description="PostgreSQL max overflow connections")
    DB_POOL_RECYCLE: int = Field(default=1800, description="PostgreSQL pool recycle timeout in seconds")
    DB_POOL_TIMEOUT: int = Field(default=30, description="PostgreSQL pool timeout in seconds")

    # Ephemeral Task Working Memory (Upstash Redis)
    UPSTASH_REDIS_REST_URL: Optional[str] = Field(
        default=None, description="Upstash Redis REST URL for ephemeral task context"
    )
    UPSTASH_REDIS_REST_TOKEN: Optional[str] = Field(
        default=None, description="Upstash Redis REST Token"
    )

    @property
    def async_database_url(self) -> str:
        """Normalizes Render/Heroku/Neon postgres:// URLs to SQLAlchemy asyncpg format."""
        url = (self.DATABASE_URL or "").strip()
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def sync_database_url(self) -> str:
        """Provides standard sync database URL for Alembic migrations and scripts."""
        if self.SYNC_DATABASE_URL and self.SYNC_DATABASE_URL != "sqlite:///./codemate.db":
            url = self.SYNC_DATABASE_URL.strip()
            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql://", 1)
            if "+asyncpg" in url:
                return url.replace("+asyncpg", "")
            return url
        url = self.async_database_url
        if "+asyncpg" in url:
            return url.replace("+asyncpg", "")
        if "+aiosqlite" in url:
            return url.replace("+aiosqlite", "")
        return url

    # Phase 6: Authentication & JWT Security
    JWT_SECRET_KEY: str = Field(
        default="codemate-phase6-super-secret-jwt-key-change-in-production-min32chars",
        description="Secret key used for signing JWT access and refresh tokens"
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=10080, description="Access token expiration in minutes (7 days default)")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30, description="Refresh token expiration in days")
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = Field(default=24, description="Email verification expiration")
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = Field(default=1, description="Password reset token expiration")

    # Google OAuth / Sign In with Google
    GOOGLE_CLIENT_ID: Optional[str] = Field(
        default=None,
        description="Google OAuth 2.0 Web Client ID for Sign in with Google"
    )
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(
        default=None,
        description="Google OAuth 2.0 Client Secret (optional for frontend token verification)"
    )

    # Phase 6: Razorpay Integration
    RAZORPAY_KEY_ID: str = Field(default="rzp_test_codemate_sandbox_id", description="Razorpay Public Key ID")
    RAZORPAY_KEY_SECRET: str = Field(default="rzp_test_codemate_dummy_secret", description="Razorpay Secret Key")
    RAZORPAY_WEBHOOK_SECRET: str = Field(default="rzp_webhook_secret_dummy_12345", description="Razorpay Webhook Secret")

    # Phase 6: Email Notification Service (Resend SMTP / Mock)
    EMAIL_PROVIDER: str = Field(default="mock", description="Email delivery provider: 'mock', 'smtp', 'resend'")
    SMTP_HOST: Optional[str] = Field(default="smtp.resend.com", description="SMTP host (smtp.resend.com for Resend)")
    SMTP_PORT: Optional[int] = Field(default=465, description="SMTP port (465 SSL, 587 STARTTLS)")
    SMTP_USER: Optional[str] = Field(default="resend", description="SMTP username ('resend' for Resend)")
    SMTP_PASSWORD: Optional[str] = Field(default=None, description="SMTP password (Resend API key starting with 're_')")
    SMTP_FROM_EMAIL: str = Field(default="onboarding@resend.dev", description="Notification sender email (e.g. onboarding@resend.dev or your verified domain)")

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            if self.ENVIRONMENT.lower() == "production":
                return ["https://codemateai.com", "https://app.codemateai.com"]
            return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
        origins = [orig.strip() for orig in self.ALLOWED_ORIGINS.split(",") if orig.strip()]
        return origins

    @field_validator("AI_PROVIDER")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        valid = {"gemini", "openai", "openrouter", "anthropic", "claude", "deepseek", "xai", "mock"}
        v_clean = v.strip().lower()
        if v_clean not in valid:
            raise ValueError(f"Unsupported AI_PROVIDER '{v}'. Must be one of: {sorted(valid)}")
        return v_clean

    @model_validator(mode="after")
    def resolve_provider_credentials(self) -> "Settings":
        provider = self.AI_PROVIDER.lower().strip()
        if not self.AI_API_KEY:
            if provider == "gemini" and self.GEMINI_API_KEY:
                self.AI_API_KEY = self.GEMINI_API_KEY
            elif provider == "openai" and self.OPENAI_API_KEY:
                self.AI_API_KEY = self.OPENAI_API_KEY
            elif self.GEMINI_API_KEY:
                self.AI_API_KEY = self.GEMINI_API_KEY
            elif self.OPENAI_API_KEY:
                self.AI_API_KEY = self.OPENAI_API_KEY

        if provider == "gemini" and self.GEMINI_MODEL:
            self.AI_MODEL = self.GEMINI_MODEL
        elif provider == "openai" and self.OPENAI_MODEL:
            self.AI_MODEL = self.OPENAI_MODEL
        return self


settings = Settings()

