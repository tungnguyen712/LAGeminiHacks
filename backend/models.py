"""Pydantic models for all API request/response shapes.

All models inherit CamelModel so:
  - JSON input is accepted as camelCase (from the React Native mobile app)
  - JSON output is serialised as camelCase (matching the TypeScript types)

Endpoints must return `model.model_dump(by_alias=True)` to activate aliases.
"""
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,   # also accept snake_case in tests / internal code
    )


# ---------------------------------------------------------------------------
# Routes  (POST /api/routes)
# ---------------------------------------------------------------------------

class RoutesRequest(CamelModel):
    origin: str
    destination: str
    profile: str    # "wheelchair" | "low-vision" | "stroller"
    mode: str = "all"  # "walking" | "transit" | "all"


class FrictionScoreOut(CamelModel):
    """Embedded friction score within a Segment (response only)."""
    friction_score: float   # → frictionScore
    confidence: float
    reasons: list[str]
    recommendation: str
    level: str              # "LOW" | "MEDIUM" | "HIGH"


class TransitLegInfo(CamelModel):
    """Extra metadata for a transit (bus/rail) segment."""
    agency_name: str = ""           # → agencyName
    route_name: str = ""            # → routeName
    vehicle_type: str = ""          # → vehicleType: BUS | SUBWAY | HEAVY_RAIL | etc.
    departure_stop: str = ""        # → departureStop
    arrival_stop: str = ""          # → arrivalStop
    wheelchair_accessible: Optional[bool] = None  # → wheelchairAccessible — None = unknown


class SegmentOut(CamelModel):
    """One step from a walking or transit route (response only)."""
    id: str
    description: str
    segment_type: str = "walk"      # → segmentType: "walk" | "transit" | "transfer"
    start_lat: float                # → startLat
    start_lng: float                # → startLng
    end_lat: float                  # → endLat
    end_lng: float                  # → endLng
    distance_meters: float          # → distanceMeters
    friction: Optional[FrictionScoreOut] = None
    transit_info: Optional[TransitLegInfo] = None  # → transitInfo (set for transit segments)


class RouteOut(CamelModel):
    """One candidate route (walking or transit) (response only)."""
    id: str
    label: str              # "fastest" | "low-friction" | "balanced" | "transit" | "transit-alt"
    mode: str = "walking"   # → mode: "walking" | "transit"
    duration_seconds: int   # → durationSeconds
    distance_meters: int    # → distanceMeters
    overall_friction: str   # → overallFriction — "LOW" | "MEDIUM" | "HIGH"
    segments: list[SegmentOut]
    polyline_encoded: str   # → polylineEncoded


class RoutesResponse(CamelModel):
    routes: list[RouteOut]


# ---------------------------------------------------------------------------
# Reroute  (POST /api/reroute)
# ---------------------------------------------------------------------------

class RerouteRequest(CamelModel):
    """Ask for a local detour around a HIGH-friction segment."""
    segment_id: str          # → segmentId — ID of the problematic segment
    start_lat: float         # → startLat
    start_lng: float         # → startLng
    end_lat: float           # → endLat
    end_lng: float           # → endLng
    profile: str


class RerouteResponse(CamelModel):
    segment_id: str                       # → segmentId — echoed back
    replacement_segments: list[SegmentOut]  # → replacementSegments
    total_distance_meters: int            # → totalDistanceMeters
    duration_seconds: int                 # → durationSeconds


# ---------------------------------------------------------------------------
# Friction  (POST /api/friction)
# ---------------------------------------------------------------------------

class SegmentIn(CamelModel):
    """Segment sent by the mobile app for friction scoring.

    Coordinates are optional for backwards compatibility, but should be
    included so the pipeline can enrich scoring with OSM data and Street View.
    Transit segments may include transitInfo for profile-aware scoring.
    """
    id: str
    description: str
    distance_meters: float              # → distanceMeters
    segment_type: str = "walk"          # → segmentType: "walk" | "transit" | "transfer"
    start_lat: Optional[float] = None   # → startLat
    start_lng: Optional[float] = None   # → startLng
    end_lat: Optional[float] = None     # → endLat
    end_lng: Optional[float] = None     # → endLng
    transit_info: Optional[TransitLegInfo] = None  # → transitInfo


class FrictionRequest(CamelModel):
    segments: list[SegmentIn]
    profile: str
    language_code: str = "en"   # → languageCode


class FrictionScoreResponse(CamelModel):
    friction_score: float   # → frictionScore
    confidence: float
    reasons: list[str]
    recommendation: str
    level: str


class FrictionResponse(CamelModel):
    scores: dict[str, FrictionScoreResponse]


# ---------------------------------------------------------------------------
# TTS / Live  (not this teammate's scope — kept for completeness)
# ---------------------------------------------------------------------------

class TTSRequest(CamelModel):
    text: str
    language_tag: str = "en-US"


class TTSResponse(CamelModel):
    audio_base64: str
    mime_type: str = "audio/wav"
