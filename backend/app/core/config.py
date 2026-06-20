from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str

    REDIS_URL: str = "redis://localhost:6379/0"

    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama3-8b-8192"
    GOOGLE_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"
    TRANSCRIPTION_PROVIDER: str = "whisperx"
    LLM_PROVIDER: str = "groq"

    EMAIL_PROVIDER: str = "smtp"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    HF_TOKEN: str
    MIGRATION_DATABASE_URL:str
    WHISPER_MODEL_SIZE: str = "base"
    TRANSCRIPTION_PROVIDER: str = "whisperx"
    UPLOAD_DIR: str = "uploads"

    SECRET_KEY: str

    WEBEX_BOT_TOKEN: str = ""
    WEBEX_WEBHOOK_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


def get_settings() -> Settings:
    return Settings()