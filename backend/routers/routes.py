from fastapi import APIRouter, HTTPException
import httpx
from config import settings
from models import RoutesRequest

router = APIRouter()

ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"


@router.post("/routes")
async def get_routes(req: RoutesRequest):
    """
    Calls Google Maps Routes API and returns up to 3 candidate routes.
    TODO: Parse polylines and segment data from response.
    """
    payload = {
        "origin": {"address": req.origin},
        "destination": {"address": req.destination},
        "travelMode": "WALK",
        "computeAlternativeRoutes": True,
    }
    headers = {
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline,routes.legs",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(ROUTES_API_URL, json=payload, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Google Maps Routes API error")
    # TODO: transform resp.json() into Route[] shape
    return resp.json()
