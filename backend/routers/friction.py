from fastapi import APIRouter, HTTPException
import httpx
import json
from config import settings
from models import FrictionRequest, FrictionResponse, FrictionScore
from constants import build_friction_prompt, score_to_level

router = APIRouter()

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/{model}:generateContent?key={key}"
)


@router.post("/friction", response_model=FrictionResponse)
async def get_friction(req: FrictionRequest):
    """
    Calls Gemini scoring model for each segment and returns friction scores.
    """
    scores: dict = {}
    async with httpx.AsyncClient(timeout=30) as client:
        for seg in req.segments:
            prompt = build_friction_prompt(
                profile=req.profile,
                language_code=req.language_code,
                segment_description=seg.description,
                distance_meters=seg.distance_meters,
            )
            url = GEMINI_API_URL.format(
                model=settings.gemini_scoring_model,
                key=settings.gemini_api_key,
            )
            resp = await client.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Gemini error for segment {seg.id}")
            raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError:
                raise HTTPException(status_code=502, detail=f"Invalid JSON from Gemini for segment {seg.id}")
            scores[seg.id] = FrictionScore(
                friction_score=data["frictionScore"],
                confidence=data["confidence"],
                reasons=data["reasons"],
                recommendation=data["recommendation"],
                level=score_to_level(data["frictionScore"]),
            )
    return FrictionResponse(scores=scores)
