from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    google_maps_api_key: str
    gemini_api_key: str
    # Scoring: set GEMINI_SCORING_MODEL in .env to override
    gemini_scoring_model: str = "gemini-2.0-flash"
    # Live API: BidiGenerateContent — must be a model that supports Live
    # Current options: gemini-3.1-flash-live-preview | gemini-2.0-flash-live-001
    gemini_live_model: str = "gemini-3.1-flash-live-preview"
    # TTS: set GEMINI_TTS_MODEL in .env to override
    gemini_tts_model: str = "gemini-2.0-flash-preview-tts"


settings = Settings()
