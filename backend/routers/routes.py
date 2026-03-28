from fastapi import APIRouter, HTTPException
import httpx
from config import settings
from models import RoutesRequest, RoutesListResponse, RouteOut, SegmentOut
from polyline import decode as decode_polyline

router = APIRouter()

ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

FIELD_MASK = (
    "routes.duration,routes.distanceMeters,routes.polyline,routes.legs.steps,"
    "routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction,"
    "routes.legs.steps.startLocation,routes.legs.steps.endLocation"
)


def _parse_duration_seconds(raw: str | int | float | None) -> int:
    if raw is None:
        return 0
    if isinstance(raw, (int, float)):
        return int(raw)
    s = str(raw).strip()
    if s.endswith("s"):
        s = s[:-1]
    try:
        return int(float(s))
    except ValueError:
        return 0


def _steps_to_segments(route_index: int, steps: list[dict]) -> list[SegmentOut]:
    out: list[SegmentOut] = []
    for i, step in enumerate(steps):
        nav = step.get("navigationInstruction") or {}
        instr = nav.get("instructions") or ""
        if not instr:
            instr = "Continue on the walking route"
        dist = float(step.get("distanceMeters") or 0)
        sl = (step.get("startLocation") or {}).get("latLng") or {}
        el = (step.get("endLocation") or {}).get("latLng") or {}
        out.append(
            SegmentOut(
                id=f"r{route_index}-s{i}",
                description=instr.strip(),
                start_lat=float(sl.get("latitude", 0)),
                start_lng=float(sl.get("longitude", 0)),
                end_lat=float(el.get("latitude", 0)),
                end_lng=float(el.get("longitude", 0)),
                distance_meters=dist,
            )
        )
    return out


def _fallback_from_polyline(
    route_index: int, encoded: str, distance_meters: float
) -> list[SegmentOut]:
    coords = decode_polyline(encoded) if encoded else []
    if len(coords) < 2:
        return []
    (s_lat, s_lng), (e_lat, e_lng) = coords[0], coords[-1]
    return [
        SegmentOut(
            id=f"r{route_index}-s0",
            description="Walking route (segment detail unavailable)",
            start_lat=s_lat,
            start_lng=s_lng,
            end_lat=e_lat,
            end_lng=e_lng,
            distance_meters=distance_meters,
        )
    ]


def _label_for(index: int, total: int) -> str:
    if total <= 0:
        return "balanced"
    if total == 1:
        return "fastest"
    if total == 2:
        return "fastest" if index == 0 else "balanced"
    labels = ("fastest", "balanced", "low-friction")
    return labels[index] if index < len(labels) else "balanced"


def _worst_friction_level() -> str:
    return "MEDIUM"


@router.post("/routes", response_model=RoutesListResponse)
async def get_routes(req: RoutesRequest) -> RoutesListResponse:
    if not settings.google_maps_api_key.strip():
        raise HTTPException(
            status_code=503,
            detail="Set GOOGLE_MAPS_API_KEY in backend/.env or repo-root .env",
        )
    payload = {
        "origin": {"address": req.origin},
        "destination": {"address": req.destination},
        "travelMode": "WALK",
        "computeAlternativeRoutes": True,
    }
    headers = {
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": FIELD_MASK,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(ROUTES_API_URL, json=payload, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Google Maps Routes API error: {resp.text[:500]}",
        )
    body = resp.json()
    raw_routes = body.get("routes") or []
    indexed: list[tuple[int, dict]] = list(enumerate(raw_routes))
    indexed.sort(
        key=lambda pair: _parse_duration_seconds(pair[1].get("duration")),
    )
    total = len(indexed)
    built: list[RouteOut] = []
    for sort_index, (_, route) in enumerate(indexed):
        duration_sec = _parse_duration_seconds(route.get("duration"))
        distance_m = float(route.get("distanceMeters") or 0)
        poly = (route.get("polyline") or {}).get("encodedPolyline") or ""
        legs = route.get("legs") or []
        steps: list[dict] = []
        for leg in legs:
            steps.extend(leg.get("steps") or [])
        if steps:
            segments = _steps_to_segments(sort_index, steps)
        else:
            segments = _fallback_from_polyline(sort_index, poly, distance_m)
        if not segments:
            segments = [
                SegmentOut(
                    id=f"r{sort_index}-s0",
                    description="Walking route",
                    start_lat=34.07,
                    start_lng=-118.44,
                    end_lat=34.07,
                    end_lng=-118.44,
                    distance_meters=distance_m,
                )
            ]
        built.append(
            RouteOut(
                id=f"route-{sort_index}",
                label=_label_for(sort_index, total),
                duration_seconds=duration_sec,
                distance_meters=distance_m,
                overall_friction=_worst_friction_level(),
                segments=segments,
                polyline_encoded=poly,
            )
        )
    return RoutesListResponse(routes=built)
