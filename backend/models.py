from pydantic import BaseModel, ConfigDict, Field


def to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class SegmentInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    description: str
    distance_meters: float = Field(alias="distanceMeters")


class RoutesRequest(BaseModel):
    origin: str
    destination: str
    profile: str  # wheelchair | low-vision | stroller


class FrictionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    segments: list[SegmentInput]
    profile: str
    language_code: str = Field(default="en", alias="languageCode")


class TTSRequest(BaseModel):
    text: str
    language_tag: str = Field(default="en-US", alias="languageTag")


class FrictionScore(CamelModel):
    friction_score: float
    confidence: float
    reasons: list[str]
    recommendation: str
    level: str  # LOW | MEDIUM | HIGH


class FrictionResponse(CamelModel):
    scores: dict[str, FrictionScore]


class TTSResponse(CamelModel):
    audio_base64: str
    mime_type: str = Field(default="audio/wav", alias="mimeType")


class SegmentOut(CamelModel):
    id: str
    description: str
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    distance_meters: float


class RouteOut(CamelModel):
    id: str
    label: str  # fastest | low-friction | balanced
    duration_seconds: int
    distance_meters: float
    overall_friction: str  # LOW | MEDIUM | HIGH
    segments: list[SegmentOut]
    polyline_encoded: str


class RoutesListResponse(CamelModel):
    routes: list[RouteOut]
