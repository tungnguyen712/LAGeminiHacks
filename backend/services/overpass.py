"""OpenStreetMap Overpass API client.

Fetches accessibility-relevant features (surface type, wheelchair tags, kerbs,
tactile paving, etc.) for a bounding box and matches them to route segments.

This is the primary differentiator from plain Google Maps routing: OSM has
crowd-sourced sidewalk-level data that the Maps API does not expose.
"""
import httpx

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# OSM tags that are relevant for accessibility scoring
ACCESSIBILITY_TAGS = frozenset([
    "surface",       # asphalt, cobblestone, gravel, dirt, …
    "smoothness",    # excellent, good, intermediate, bad, horrible
    "wheelchair",    # yes, no, limited
    "incline",       # up, down, 5%, 10%, …
    "width",         # metres, e.g. "1.5"
    "tactile_paving",# yes, no
    "kerb",          # lowered, raised, flush, no
    "handrail",      # yes, no, left, right, both
    "step_count",    # integer
    "lit",           # yes, no (lighting)
    "highway",       # footway, path, steps, crossing, …
    "barrier",       # fence, wall, bollard, gate, …
])

# Proximity threshold in degrees (~55m at mid-latitudes)
MATCH_RADIUS_DEG = 0.0005


def compute_bbox(
    segments: list[dict],
    buffer_deg: float = 0.001,
) -> tuple[float, float, float, float]:
    """Return (min_lat, min_lng, max_lat, max_lng) covering all segment coords.

    buffer_deg adds padding so nearby OSM features aren't missed.
    """
    lats = [s["startLat"] for s in segments] + [s["endLat"] for s in segments]
    lngs = [s["startLng"] for s in segments] + [s["endLng"] for s in segments]
    return (
        min(lats) - buffer_deg,
        min(lngs) - buffer_deg,
        max(lats) + buffer_deg,
        max(lngs) + buffer_deg,
    )


async def fetch_accessibility_features(
    bbox: tuple[float, float, float, float],
) -> list[dict]:
    """Query Overpass for accessibility features within the bounding box.

    Returns raw OSM elements. Returns [] on any error so the pipeline
    degrades gracefully (text-only Gemini scoring still works).
    """
    min_lat, min_lng, max_lat, max_lng = bbox
    bbox_str = f"{min_lat},{min_lng},{max_lat},{max_lng}"

    # Query footways, wheelchair-tagged ways, kerb nodes, tactile paving, barriers
    query = f"""[out:json][timeout:15];
(
  way["highway"~"footway|path|pedestrian|steps|crossing"]({bbox_str});
  way["wheelchair"]({bbox_str});
  way["surface"]({bbox_str});
  node["kerb"]({bbox_str});
  node["tactile_paving"="yes"]({bbox_str});
  node["barrier"]({bbox_str});
);
out center tags;
"""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
        if resp.status_code != 200:
            return []
        return resp.json().get("elements", [])
    except Exception:
        return []  # non-fatal — Gemini will fall back to text-only inference


def match_tags_to_segment(
    mid_lat: float,
    mid_lng: float,
    elements: list[dict],
) -> dict[str, str]:
    """Find the closest OSM element's accessibility tags for a segment midpoint.

    Picks the nearest element within MATCH_RADIUS_DEG that has at least one
    accessibility-relevant tag. Returns {} if nothing close enough.
    """
    best_tags: dict[str, str] = {}
    best_dist = float("inf")

    for elem in elements:
        lat = elem.get("lat") or elem.get("center", {}).get("lat")
        lon = elem.get("lon") or elem.get("center", {}).get("lon")
        if lat is None or lon is None:
            continue

        dist = ((lat - mid_lat) ** 2 + (lon - mid_lng) ** 2) ** 0.5
        if dist >= MATCH_RADIUS_DEG or dist >= best_dist:
            continue

        tags = elem.get("tags", {})
        relevant = {k: v for k, v in tags.items() if k in ACCESSIBILITY_TAGS}
        if relevant:
            best_tags = relevant
            best_dist = dist

    return best_tags
