"""Google Street View Static API client.

Fetches a Street View image for a coordinate, used to give Gemini visual
evidence when scoring suspicious (HIGH friction or low-confidence) segments.

Cost: ~$0.007/image after the free monthly allowance.
The metadata endpoint is free and is always called first to avoid
billing a charge for a location with no panorama.
"""
import httpx

METADATA_URL = "https://maps.googleapis.com/maps/api/streetview/metadata"
IMAGE_URL = "https://maps.googleapis.com/maps/api/streetview"

# Search radius for finding the nearest available panorama (metres)
PANORAMA_RADIUS = 50


async def fetch_street_view_image(
    lat: float,
    lng: float,
    api_key: str,
) -> bytes | None:
    """Return JPEG bytes for the Street View panorama nearest to (lat, lng).

    Returns None if no panorama is available within PANORAMA_RADIUS metres
    (free metadata check) or if the image download fails.
    """
    location = f"{lat},{lng}"
    params_base = {"location": location, "radius": str(PANORAMA_RADIUS), "key": api_key}

    async with httpx.AsyncClient(timeout=10) as client:
        # 1. Free metadata check — avoids billing on missing panoramas
        meta_resp = await client.get(METADATA_URL, params=params_base)
        if meta_resp.status_code != 200 or meta_resp.json().get("status") != "OK":
            return None

        # 2. Fetch image — slight downward pitch to show the pavement surface
        img_resp = await client.get(IMAGE_URL, params={
            **params_base,
            "size": "640x480",
            "fov": "90",
            "pitch": "-10",   # tilt down to capture sidewalk / surface
        })
        if img_resp.status_code == 200:
            return img_resp.content

    return None
