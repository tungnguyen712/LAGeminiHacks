from pydantic import BaseModel
from typing import Optional


class SegmentInput(BaseModel):
    id: str
    description: str
    distance_meters: float


class RoutesRequest(BaseModel):
    origin: str
    destination: str
    profile: str  # wheelchair | low-vision | stroller


class FrictionRequest(BaseModel):
    segments: list[SegmentInput]
    profile: str
    language_code: str = "en"


class TTSRequest(BaseModel):
    text: str
    language_tag: str = "en-US"


class FrictionScore(BaseModel):
    friction_score: float
    confidence: float
    reasons: list[str]
    recommendation: str
    level: str  # LOW | MEDIUM | HIGH


class FrictionResponse(BaseModel):
    scores: dict[str, FrictionScore]


class TTSResponse(BaseModel):
    audio_base64: str
    mime_type: str = "audio/wav"
