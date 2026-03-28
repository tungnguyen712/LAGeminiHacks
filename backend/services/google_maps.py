"""Google Maps Routes API client.

Fetches walking routes (up to 3) and transit routes (up to 2) and transforms
them into the internal segment shape expected by the rest of the pipeline.

Walking route padding strategy
-------------------------------
Walking mode often returns only 1 alternative even with computeAlternativeRoutes=True.
When fewer than 3 routes come back, we make up to 2 extra requests using offset
intermediate waypoints (derived from the first route's midpoint coordinates).
This forces Google Maps to find genuinely different paths.

Transit routing
---------------
A single TRANSIT request is made. Up to 2 distinct transit routes are returned
(best + 1 alternative if it differs meaningfully in transfer count or time).
Each transit step's transitDetails are preserved so downstream services can
apply profile-aware accessibility scoring.

Local detour
------------
fetch_detour_routes() accepts a start/end coord pair and an optional avoid-area
centroid. It fires 1-2 waypoint-routed requests and returns replacement steps.
"""
import asyncio
import math
import httpx

ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

FIELD_MASK = ",".join([
    "routes.duration",
    "routes.distanceMeters",
    "routes.polyline.encodedPolyline",
    "routes.legs.steps.navigationInstruction.instructions",
    "routes.legs.steps.distanceMeters",
    "routes.legs.steps.startLocation.latLng",
    "routes.legs.steps.endLocation.latLng",
])

TRANSIT_FIELD_MASK = ",".join([
    "routes.duration",
    "routes.distanceMeters",
    "routes.polyline.encodedPolyline",
    "routes.legs.steps.navigationInstruction.instructions",
    "routes.legs.steps.distanceMeters",
    "routes.legs.steps.startLocation.latLng",
    "routes.legs.steps.endLocation.latLng",
    "routes.legs.steps.travelMode",
    "routes.legs.steps.transitDetails",
])

ROUTE_LABELS = ["fastest", "low-friction", "balanced"]

# Perpendicular offsets (~110m) applied to the route midpoint to request
# alternative paths.  North+East and South+West push routes in opposite directions.
_WAYPOINT_OFFSETS = [
    ( 0.001,  0.001),   # ~110 m north-east
    (-0.001, -0.001),   # ~110 m south-west
]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _location_field(value: str) -> dict:
    """Return a Routes API location object.

    If *value* looks like 'lat,lng' (e.g. '34.0522,-118.2437') use the
    latLng form so the API accepts raw coordinates from the GPS button.
    Otherwise fall back to the address form.
    """
    parts = value.split(",")
    if len(parts) == 2:
        try:
            lat, lng = float(parts[0].strip()), float(parts[1].strip())
            return {"location": {"latLng": {"latitude": lat, "longitude": lng}}}
        except ValueError:
            pass
    return {"address": value}


def _build_payload(
    origin: str,
    destination: str,
    intermediate_latlng: tuple[float, float] | None = None,
) -> dict:
    payload: dict = {
        "origin": _location_field(origin),
        "destination": _location_field(destination),
        "travelMode": "WALK",
        "units": "METRIC",
    }
    if intermediate_latlng is None:
        payload["computeAlternativeRoutes"] = True
    else:
        lat, lng = intermediate_latlng
        payload["intermediates"] = [{
            "location": {"latLng": {"latitude": lat, "longitude": lng}}
        }]
    return payload


async def _single_request(payload: dict, api_key: str, field_mask: str = FIELD_MASK) -> list[dict]:
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": field_mask,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(ROUTES_API_URL, json=payload, headers=headers)
    resp.raise_for_status()
    return resp.json().get("routes", [])


def _route_duration(raw: dict) -> int:
    return int(raw.get("duration", "0s").rstrip("s"))


def _is_duplicate(candidate: dict, existing: list[dict], tolerance: float = 0.10) -> bool:
    """True if candidate has duration within ±tolerance of any existing route."""
    cand_dur = _route_duration(candidate)
    for r in existing:
        existing_dur = _route_duration(r)
        if existing_dur and abs(cand_dur - existing_dur) / existing_dur <= tolerance:
            return True
    return False


def _midpoint_of_route(raw: dict) -> tuple[float, float] | None:
    """Return the lat/lng of the middle step in the first leg."""
    steps = raw.get("legs", [{}])[0].get("steps", [])
    if not steps:
        return None
    mid = steps[len(steps) // 2]
    ll = mid.get("startLocation", {}).get("latLng", {})
    lat, lng = ll.get("latitude"), ll.get("longitude")
    return (lat, lng) if lat and lng else None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def fetch_walking_routes(origin: str, destination: str, api_key: str) -> list[dict]:
    """Return up to 3 walking routes, padding with waypoint-offset requests if needed."""
    # 1. Primary request — ask Google for alternatives in one shot
    routes = await _single_request(_build_payload(origin, destination), api_key)

    if len(routes) >= 3:
        return routes[:3]

    # 2. Extract the midpoint of the first route to anchor our offset waypoints
    mid = _midpoint_of_route(routes[0]) if routes else None
    if mid is None:
        return routes  # no coordinates to offset from

    # 3. Fire only as many offset requests as we actually need
    needed = 3 - len(routes)
    mid_lat, mid_lng = mid
    extra_payloads = [
        _build_payload(origin, destination, (mid_lat + dlat, mid_lng + dlng))
        for dlat, dlng in _WAYPOINT_OFFSETS[:needed]
    ]

    extra_results = await asyncio.gather(
        *[_single_request(p, api_key) for p in extra_payloads],
        return_exceptions=True,
    )

    for result in extra_results:
        if isinstance(result, Exception) or not result:
            continue
        route_list: list[dict] = result  # type: ignore[assignment]  # narrowed above
        candidate = route_list[0]  # take the first (best) route per waypoint request
        if not _is_duplicate(candidate, routes):
            routes.append(candidate)
        if len(routes) >= 3:
            break

    return routes[:3]


def parse_routes(raw_routes: list[dict]) -> list[dict]:
    """Transform raw Google Maps walking routes into the Route[] shape.

    Each step becomes one Segment. Coordinates are preserved so downstream
    services (Overpass, Street View) can use them.
    """
    result = []
    for i, raw in enumerate(raw_routes[:3]):
        duration_secs = _route_duration(raw)

        segments: list[dict] = []
        step_num = 0
        for leg in raw.get("legs", []):
            for step in leg.get("steps", []):
                start = step.get("startLocation", {}).get("latLng", {})
                end   = step.get("endLocation",   {}).get("latLng", {})
                instructions = (
                    step.get("navigationInstruction", {}).get("instructions")
                    or f"Continue ({step.get('distanceMeters', 0):.0f}m)"
                )
                segments.append({
                    "id":            f"r{i}s{step_num}",
                    "description":   instructions,
                    "segmentType":   "walk",
                    "startLat":      start.get("latitude",  0.0),
                    "startLng":      start.get("longitude", 0.0),
                    "endLat":        end.get("latitude",    0.0),
                    "endLng":        end.get("longitude",   0.0),
                    "distanceMeters": step.get("distanceMeters", 0),
                })
                step_num += 1

        label = ROUTE_LABELS[i] if i < len(ROUTE_LABELS) else "balanced"
        result.append({
            "id":              f"route-{i}",
            "label":           label,
            "mode":            "walking",
            "durationSeconds": duration_secs,
            "distanceMeters":  raw.get("distanceMeters", 0),
            "overallFriction": "MEDIUM",
            "segments":        segments,
            "polylineEncoded": raw.get("polyline", {}).get("encodedPolyline", ""),
        })
    return result


# ---------------------------------------------------------------------------
# Transit routing
# ---------------------------------------------------------------------------

def _build_transit_payload(origin: str, destination: str) -> dict:
    return {
        "origin": _location_field(origin),
        "destination": _location_field(destination),
        "travelMode": "TRANSIT",
        "units": "METRIC",
        "computeAlternativeRoutes": True,
    }


def _transit_transfers(raw: dict) -> int:
    """Count the number of transit vehicle boardings in a route."""
    count = 0
    for leg in raw.get("legs", []):
        for step in leg.get("steps", []):
            if step.get("travelMode") == "TRANSIT":
                count += 1
    return count


def _parse_transit_details(step: dict) -> dict | None:
    """Extract TransitLegInfo fields from a TRANSIT step."""
    td = step.get("transitDetails")
    if not td:
        return None
    line = td.get("transitLine", {})
    agencies = line.get("agencies", [{}])
    stop_details = td.get("stopDetails", {})
    vehicle = line.get("vehicle", {})
    # wheelchair_accessible is a boolean field on transitLine when available
    accessible = line.get("wheelchairAccessible")
    return {
        "agencyName":          agencies[0].get("name", "") if agencies else "",
        "routeName":           line.get("nameShort") or line.get("name", ""),
        "vehicleType":         vehicle.get("type", ""),
        "departureStop":       stop_details.get("departureStop", {}).get("name", ""),
        "arrivalStop":         stop_details.get("arrivalStop", {}).get("name", ""),
        "wheelchairAccessible": accessible,
    }


def _is_transit_duplicate(candidate: dict, existing: list[dict]) -> bool:
    """True if candidate has same transfer count AND duration within ±20%."""
    cand_transfers = _transit_transfers(candidate)
    cand_dur = _route_duration(candidate)
    for r in existing:
        if _transit_transfers(r) == cand_transfers:
            ref_dur = _route_duration(r)
            if ref_dur and abs(cand_dur - ref_dur) / ref_dur <= 0.20:
                return True
    return False


# Minimum fraction of distanceMeters that must be on a transit vehicle.
# Routes below this threshold (mostly walking with a token bus stop) are
# excluded — they offer no meaningful transit advantage over walking only.
MIN_TRANSIT_SHARE = 0.25


def _transit_distance_share(raw: dict) -> float:
    """Fraction of route distanceMeters that is on transit vehicles (not walking)."""
    total = raw.get("distanceMeters", 0)
    if not total:
        return 0.0
    transit_dist = sum(
        step.get("distanceMeters", 0)
        for leg in raw.get("legs", [])
        for step in leg.get("steps", [])
        if step.get("travelMode") == "TRANSIT"
    )
    return transit_dist / total


async def fetch_transit_routes(origin: str, destination: str, api_key: str) -> list[dict]:
    """Return up to 2 distinct transit routes between origin and destination.

    Filters out routes where less than MIN_TRANSIT_SHARE (25%) of the total
    distance is on a transit vehicle — these are effectively walking routes
    with a token bus stop and offer no meaningful transit advantage.

    Returns [] if transit routing fails (non-fatal — walking routes still shown).
    """
    try:
        payload = _build_transit_payload(origin, destination)
        routes = await _single_request(payload, api_key, field_mask=TRANSIT_FIELD_MASK)
    except Exception as exc:
        print(f"[google_maps] Transit fetch failed (non-fatal): {exc}")
        return []

    # Deduplicate and enforce minimum transit share
    unique: list[dict] = []
    for r in routes:
        if _transit_distance_share(r) < MIN_TRANSIT_SHARE:
            continue  # mostly walking — skip
        if not _is_transit_duplicate(r, unique):
            unique.append(r)
        if len(unique) >= 2:
            break
    return unique


def parse_transit_routes(raw_routes: list[dict], route_index_offset: int = 0) -> list[dict]:
    """Transform raw Google Maps transit routes into the Route[] shape.

    Walking sub-steps within a transit route get segmentType="walk".
    Transit boarding steps get segmentType="transit" plus transitInfo.
    Transfer/waiting steps get segmentType="transfer".
    """
    labels = ["transit", "transit-alt"]
    result = []
    for i, raw in enumerate(raw_routes[:2]):
        duration_secs = _route_duration(raw)
        route_idx = route_index_offset + i

        segments: list[dict] = []
        step_num = 0
        for leg in raw.get("legs", []):
            for step in leg.get("steps", []):
                start = step.get("startLocation", {}).get("latLng", {})
                end   = step.get("endLocation",   {}).get("latLng", {})
                travel_mode = step.get("travelMode", "WALK")
                instructions = (
                    step.get("navigationInstruction", {}).get("instructions")
                    or f"Continue ({step.get('distanceMeters', 0):.0f}m)"
                )

                if travel_mode == "TRANSIT":
                    seg_type = "transit"
                    transit_info = _parse_transit_details(step)
                    # Override description with route name if present
                    if transit_info and transit_info.get("routeName"):
                        dep = transit_info.get("departureStop", "")
                        arr = transit_info.get("arrivalStop", "")
                        route_name = transit_info["routeName"]
                        instructions = f"Take {route_name} from {dep} to {arr}"
                else:
                    seg_type = "walk"
                    transit_info = None

                seg: dict = {
                    "id":            f"t{route_idx}s{step_num}",
                    "description":   instructions,
                    "segmentType":   seg_type,
                    "startLat":      start.get("latitude",  0.0),
                    "startLng":      start.get("longitude", 0.0),
                    "endLat":        end.get("latitude",    0.0),
                    "endLng":        end.get("longitude",   0.0),
                    "distanceMeters": step.get("distanceMeters", 0),
                }
                if transit_info:
                    seg["transitInfo"] = transit_info
                segments.append(seg)
                step_num += 1

        label = labels[i] if i < len(labels) else "transit-alt"
        result.append({
            "id":              f"route-transit-{i}",
            "label":           label,
            "mode":            "transit",
            "durationSeconds": duration_secs,
            "distanceMeters":  raw.get("distanceMeters", 0),
            "overallFriction": "MEDIUM",
            "segments":        segments,
            "polylineEncoded": raw.get("polyline", {}).get("encodedPolyline", ""),
        })
    return result


# ---------------------------------------------------------------------------
# Local detour routing
# ---------------------------------------------------------------------------

def _perpendicular_offsets(
    start_lat: float, start_lng: float,
    end_lat: float, end_lng: float,
    distance_deg: float = 0.001,
) -> list[tuple[float, float]]:
    """Return two midpoints offset perpendicularly to the start→end bearing.

    Each offset is ~110 m (0.001 deg) to the left and right of the midpoint.
    """
    mid_lat = (start_lat + end_lat) / 2
    mid_lng = (start_lng + end_lng) / 2

    dlat = end_lat - start_lat
    dlng = end_lng - start_lng
    length = math.hypot(dlat, dlng) or 1e-9

    # Unit perpendicular vector (rotate 90°)
    perp_lat = -dlng / length * distance_deg
    perp_lng =  dlat / length * distance_deg

    return [
        (mid_lat + perp_lat, mid_lng + perp_lng),
        (mid_lat - perp_lat, mid_lng - perp_lng),
    ]


def _build_latlng_payload(
    start_lat: float, start_lng: float,
    end_lat: float, end_lng: float,
    intermediate_latlng: tuple[float, float] | None = None,
) -> dict:
    """Build a Routes API payload using coordinate-based origin/destination.

    The Routes API v2 requires {"location": {"latLng": ...}} for coordinates —
    NOT {"address": "lat,lng"} which the API rejects with a 404/empty result.
    """
    payload: dict = {
        "origin":      {"location": {"latLng": {"latitude": start_lat, "longitude": start_lng}}},
        "destination": {"location": {"latLng": {"latitude": end_lat,   "longitude": end_lng}}},
        "travelMode": "WALK",
        "units": "METRIC",
    }
    if intermediate_latlng is not None:
        lat, lng = intermediate_latlng
        payload["intermediates"] = [{
            "location": {"latLng": {"latitude": lat, "longitude": lng}}
        }]
    return payload


async def fetch_detour_routes(
    start_lat: float, start_lng: float,
    end_lat: float, end_lng: float,
    api_key: str,
) -> list[dict]:
    """Return detour routes from start to end via perpendicular waypoints.

    Fires two parallel requests (one left-offset, one right-offset waypoint)
    and returns whichever succeed (up to 2).  Each returned raw route contains
    the full step list for the detour.
    """
    offsets = _perpendicular_offsets(start_lat, start_lng, end_lat, end_lng)

    payloads = [
        _build_latlng_payload(start_lat, start_lng, end_lat, end_lng, waypoint)
        for waypoint in offsets
    ]

    results = await asyncio.gather(
        *[_single_request(p, api_key) for p in payloads],
        return_exceptions=True,
    )

    routes: list[dict] = []
    for result in results:
        if isinstance(result, Exception) or not result:
            continue
        route_list: list[dict] = result  # type: ignore[assignment]
        routes.append(route_list[0])

    return routes


def parse_detour_segments(raw_routes: list[dict], segment_id: str) -> list[dict]:
    """Parse the first valid detour route into a flat list of segments.

    Segment IDs are prefixed with the original segment_id so the client
    can correlate them.
    """
    if not raw_routes:
        return []

    best = min(raw_routes, key=_route_duration)
    segments: list[dict] = []
    step_num = 0
    for leg in best.get("legs", []):
        for step in leg.get("steps", []):
            start = step.get("startLocation", {}).get("latLng", {})
            end   = step.get("endLocation",   {}).get("latLng", {})
            instructions = (
                step.get("navigationInstruction", {}).get("instructions")
                or f"Continue ({step.get('distanceMeters', 0):.0f}m)"
            )
            segments.append({
                "id":            f"{segment_id}_detour_s{step_num}",
                "description":   instructions,
                "segmentType":   "walk",
                "startLat":      start.get("latitude",  0.0),
                "startLng":      start.get("longitude", 0.0),
                "endLat":        end.get("latitude",    0.0),
                "endLng":        end.get("longitude",   0.0),
                "distanceMeters": step.get("distanceMeters", 0),
            })
            step_num += 1
    return segments
