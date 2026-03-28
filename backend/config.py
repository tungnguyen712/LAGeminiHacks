from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_maps_api_key: str
    gemini_api_key: str
    # TODO: update model IDs when Gemini 3 GA names are confirmed
    gemini_scoring_model: str = "gemini-3-flash"
    gemini_live_model: str = "gemini-3.1-flash-live-001"
    gemini_tts_model: str = "gemini-3.0-flash-preview-tts"

    class Config:
        env_file = ".env"


settings = Settings()
