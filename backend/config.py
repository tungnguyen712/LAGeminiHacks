from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Loads `.env` from `backend/` first, then repo root (so `../.env` works)."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Empty defaults let the API boot so you can hit /api/health without keys; set real keys in .env for Maps/Gemini.
    google_maps_api_key: str = ""
    gemini_api_key: str = ""
    gemini_scoring_model: str = "gemini-2.5-flash"
    gemini_live_model: str = "gemini-2.5-flash-native-audio-preview-12-2025"
    gemini_tts_model: str = "gemini-2.5-flash-preview-tts"


settings = Settings()
