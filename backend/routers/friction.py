import json
import re
from fastapi import APIRouter, HTTPException
import httpx
from config import settings
from models import FrictionRequest, FrictionResponse, FrictionScore
from constants import build_friction_prompt, score_to_level

router = APIRouter()

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/{model}:generateContent?key={key}"
)


def _extract_json_object(text: str) -> dict:
    t = text.strip()
    fence = re.match(r"^```(?:json)?\s*\n?", t)
    if fence:
        t = t[fence.end() :]
        t = re.sub(r"\n?```\s*$", "", t).strip()
    return json.loads(t)


@router.post("/friction", response_model=FrictionResponse)
async def get_friction(req: FrictionRequest):
    if not settings.gemini_api_key.strip():
        raise HTTPException(
            status_code=503,
            detail="Set GEMINI_API_KEY in backend/.env or repo-root .env",
        )
    scores: dict[str, FrictionScore] = {}
    async with httpx.AsyncClient(timeout=60) as client:
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
                raise HTTPException(
                    status_code=502,
                    detail=f"Gemini error for segment {seg.id}: {resp.text[:400]}",
                )
            try:
                raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError) as e:
                raise HTTPException(
                    status_code=502,
                    detail=f"Unexpected Gemini response for segment {seg.id}: {e}",
                )
            try:
                data = _extract_json_object(raw_text)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=502,
                    detail=f"Invalid JSON from Gemini for segment {seg.id}: {e}",
                )
            fs = data.get("frictionScore", data.get("friction_score"))
            conf = data.get("confidence")
            if fs is None or conf is None:
                raise HTTPException(
                    status_code=502,
                    detail=f"Missing friction fields for segment {seg.id}",
                )
            scores[seg.id] = FrictionScore(
                friction_score=float(fs),
                confidence=float(conf),
                reasons=list(data.get("reasons") or []),
                recommendation=str(data.get("recommendation") or ""),
                level=score_to_level(float(fs)),
            )
    return FrictionResponse(scores=scores)
