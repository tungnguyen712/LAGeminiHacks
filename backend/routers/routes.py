"""POST /api/routes

Fetches up to 3 walking route candidates AND up to 2 transit routes from
the Google Maps Routes API in parallel, then returns them in a single
RoutesResponse.

Route labels:
  Walking:  route-0 → "fastest",   route-1 → "low-friction",  route-2 → "balanced"
  Transit:  route-transit-0 → "transit",  route-transit-1 → "transit-alt"

The mobile app re-evaluates walking labels once POST /api/friction returns scores.
Transit routes are always labelled "transit" / "transit-alt".

Walking routes are always returned first; transit routes follow.
"""
import asyncio

from fastapi import APIRouter, HTTPException

from config import settings
from models import RoutesRequest, RoutesResponse, RouteOut, SegmentOut, TransitLegInfo
from services import google_maps

router = APIRouter()


def _build_segment_out(seg: dict) -> SegmentOut:
    """Convert a raw parsed-segment dict into a typed SegmentOut."""
    transit_raw = seg.get("transitInfo")
    transit_info = TransitLegInfo(**transit_raw) if transit_raw else None
    return SegmentOut(
        id=seg["id"],
        description=seg["description"],
        segment_type=seg.get("segmentType", "walk"),
        start_lat=seg["startLat"],
        start_lng=seg["startLng"],
        end_lat=seg["endLat"],
        end_lng=seg["endLng"],
        distance_meters=seg["distanceMeters"],
        transit_info=transit_info,
    )


@router.post("/routes", response_model=RoutesResponse)
async def get_routes(req: RoutesRequest) -> dict:
    # 1. Fetch only the modes the caller requested (default: all)
    want_walking = req.mode in ("walking", "all")
    want_transit = req.mode in ("transit", "all")

    async def _noop() -> list:
        return []

    walking_coro = (
        google_maps.fetch_walking_routes(
            origin=req.origin,
            destination=req.destination,
            api_key=settings.google_maps_api_key,
        )
        if want_walking else _noop()
    )
    transit_coro = (
        google_maps.fetch_transit_routes(
            origin=req.origin,
            destination=req.destination,
            api_key=settings.google_maps_api_key,
        )
        if want_transit else _noop()
    )

    try:
        walking_raw, transit_raw = await asyncio.gather(
            walking_coro, transit_coro,
            return_exceptions=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Routes fetch error: {exc}")

    # Walking is required when requested
    if want_walking:
        if isinstance(walking_raw, Exception):
            raise HTTPException(status_code=502, detail=f"Google Maps Routes API error: {walking_raw}")
        if not walking_raw:
            raise HTTPException(
                status_code=404,
                detail="No walking routes found between the given origin and destination.",
            )
    else:
        walking_raw = []

    # Transit failure is non-fatal
    if isinstance(transit_raw, Exception):
        print(f"[routes] Transit fetch failed (non-fatal): {transit_raw}")
        transit_raw = []

    # Transit-only: 404 if nothing came back
    if want_transit and not want_walking and not transit_raw:
        raise HTTPException(
            status_code=404,
            detail="No transit routes found between the given origin and destination.",
        )

    # 2. Parse routes
    walking_parsed = google_maps.parse_routes(walking_raw)
    transit_parsed = google_maps.parse_transit_routes(
        transit_raw,
        route_index_offset=len(walking_parsed),
    )

    # 3. Build typed RouteOut objects
    routes: list[RouteOut] = []

    for r in walking_parsed:
        segments = [_build_segment_out(seg) for seg in r["segments"]]
        routes.append(RouteOut(
            id=r["id"],
            label=r["label"],
            mode=r.get("mode", "walking"),
            duration_seconds=r["durationSeconds"],
            distance_meters=r["distanceMeters"],
            overall_friction=r["overallFriction"],
            segments=segments,
            polyline_encoded=r["polylineEncoded"],
        ))

    for r in transit_parsed:
        segments = [_build_segment_out(seg) for seg in r["segments"]]
        routes.append(RouteOut(
            id=r["id"],
            label=r["label"],
            mode=r.get("mode", "transit"),
            duration_seconds=r["durationSeconds"],
            distance_meters=r["distanceMeters"],
            overall_friction=r["overallFriction"],
            segments=segments,
            polyline_encoded=r["polylineEncoded"],
        ))

    return RoutesResponse(routes=routes).model_dump(by_alias=True)
