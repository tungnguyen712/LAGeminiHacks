"""POST /api/reroute

Returns a local detour around a HIGH-friction segment.

The client supplies the segment's start/end coordinates and the endpoint fires
two parallel Google Maps requests — one via a waypoint ~110 m to the left of
the midpoint, one to the right — and returns the shorter of the two as the
replacement path.

The response includes flat replacement segments (same shape as SegmentOut).
The client may optionally call POST /api/friction on the replacement segments
to get friction scores before committing to the detour.
"""
from fastapi import APIRouter, HTTPException

from config import settings
from models import RerouteRequest, RerouteResponse, SegmentOut
from services import google_maps

router = APIRouter()


@router.post("/reroute", response_model=RerouteResponse)
async def reroute(req: RerouteRequest) -> dict:
    # Fetch detour routes via perpendicular waypoints
    try:
        raw_routes = await google_maps.fetch_detour_routes(
            start_lat=req.start_lat,
            start_lng=req.start_lng,
            end_lat=req.end_lat,
            end_lng=req.end_lng,
            api_key=settings.google_maps_api_key,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Google Maps Routes API error: {exc}")

    if not raw_routes:
        raise HTTPException(
            status_code=404,
            detail="No detour found for the given segment. The area may have limited walkable paths.",
        )

    # Parse the best detour into flat segments
    raw_segments = google_maps.parse_detour_segments(raw_routes, req.segment_id)

    if not raw_segments:
        raise HTTPException(status_code=404, detail="Detour route contained no walkable steps.")

    # Sum totals from the best route (parse_detour_segments picks min-duration)
    import math
    best_raw = min(raw_routes, key=lambda r: int(r.get("duration", "0s").rstrip("s")))
    total_distance = best_raw.get("distanceMeters", 0)
    duration_secs = int(best_raw.get("duration", "0s").rstrip("s"))

    segments = [SegmentOut(**seg) for seg in raw_segments]

    return RerouteResponse(
        segment_id=req.segment_id,
        replacement_segments=segments,
        total_distance_meters=total_distance,
        duration_seconds=duration_secs,
    ).model_dump(by_alias=True)
