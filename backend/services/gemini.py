"""Gemini API client for accessibility friction scoring.

Two scoring modes:
  1. Batch text scoring  — one Gemini call per group of BATCH_SIZE segments.
     Uses OSM tags as primary evidence. Fast and cheap.
  2. Vision scoring      — one Gemini call per suspicious segment, with a
     Street View JPEG passed as inline image data.
     Only triggered for segments with frictionScore >= SUSPICIOUS_SCORE_THRESHOLD
     OR confidence < SUSPICIOUS_CONFIDENCE_THRESHOLD.

Rate limiting: a module-level asyncio.Semaphore caps concurrent calls.
Rate-429 responses are retried with exponential back-off.
"""
import asyncio
import base64
import json

import httpx

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/{model}:generateContent?key={key}"
)

BATCH_SIZE = 6
SUSPICIOUS_SCORE_THRESHOLD = 0.65
SUSPICIOUS_CONFIDENCE_THRESHOLD = 0.70
MAX_CONCURRENT = 10
MAX_RETRIES = 2

PROFILE_DESCRIPTIONS: dict[str, str] = {
    "wheelchair": (
        "uses a manual wheelchair — needs kerb ramps, smooth hard surfaces, "
        "avoids stairs, steep inclines (>5%), loose gravel, and passages <0.9m wide"
    ),
    "low-vision": (
        "has low vision — relies on tactile paving, well-lit paths, "
        "and clear signage; finds complex multi-lane crossings and "
        "inconsistent pavement very difficult"
    ),
    "stroller": (
        "pushing a stroller — needs smooth surfaces, kerb ramps, "
        "passages ≥0.8m wide; avoids stairs, cobblestones, and sharp curbs"
    ),
}

# Created lazily inside the running event loop
_semaphore: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    return _semaphore


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

TRANSIT_VEHICLE_PROFILES: dict[str, dict[str, str]] = {
    "wheelchair": {
        "BUS":         "check for low-floor / kneeling bus; boarding ramp or level entry",
        "SUBWAY":      "elevator required at station; gap between train and platform",
        "HEAVY_RAIL":  "level boarding or bridge plate; accessible toilet on long routes",
        "LIGHT_RAIL":  "low-floor tram; kerb-level platform preferred",
        "FERRY":       "accessible gangway; may be difficult in rough conditions",
        "CABLE_CAR":   "usually inaccessible — high barrier for wheelchair users",
        "GONDOLA":     "usually inaccessible",
        "FUNICULAR":   "may have accessible car; confirm with operator",
        "OTHER":       "verify accessibility with operator",
    },
    "low-vision": {
        "BUS":         "audio announcements; tactile warning strips at stop; driver assistance",
        "SUBWAY":      "tactile paving to platform; audio PA; high-contrast signage",
        "HEAVY_RAIL":  "audio announcements; station staff assistance",
        "LIGHT_RAIL":  "audio stop announcements; tactile platform edge",
        "OTHER":       "check for audio guidance",
    },
    "stroller": {
        "BUS":         "low-floor bus or ramp; dedicated pram space",
        "SUBWAY":      "elevator to platform; wide doors; space for pram",
        "HEAVY_RAIL":  "step-free boarding; pram/bicycle area",
        "LIGHT_RAIL":  "low-floor tram; pram space",
        "OTHER":       "check for step-free access",
    },
}


def _transit_guidance(profile: str, vehicle_type: str) -> str:
    profile_map = TRANSIT_VEHICLE_PROFILES.get(profile, {})
    return (
        profile_map.get(vehicle_type)
        or profile_map.get("OTHER")
        or "verify accessibility with the operator"
    )


def build_batch_prompt(
    segments: list,
    profile: str,
    language_code: str,
    osm_tags: dict[str, dict],
    alerts: dict[str, list[str]] | None = None,
) -> str:
    """Build the batch-scoring prompt for up to BATCH_SIZE segments.

    Handles mixed walk + transit segments.  For transit segments the prompt
    includes vehicle-type accessibility context and any LA Metro service alerts.
    """
    profile_desc = PROFILE_DESCRIPTIONS.get(profile, profile)
    alerts = alerts or {}
    lines: list[str] = []
    for i, seg in enumerate(segments, 1):
        tags = osm_tags.get(seg.id, {})
        osm_str = (
            ", ".join(f"{k}={v}" for k, v in tags.items())
            if tags else "no OSM data"
        )

        seg_type = getattr(seg, "segment_type", "walk")
        transit_info = getattr(seg, "transit_info", None)

        if seg_type == "transit" and transit_info:
            vehicle_type = getattr(transit_info, "vehicle_type", "") or "OTHER"
            guidance = _transit_guidance(profile, vehicle_type)
            dep_stop = getattr(transit_info, "departure_stop", "")
            arr_stop = getattr(transit_info, "arrival_stop", "")
            route_name = getattr(transit_info, "route_name", "")
            # Include any live service alerts at this stop
            stop_alerts = alerts.get(dep_stop, []) + alerts.get(arr_stop, [])
            alert_str = "; ".join(stop_alerts) if stop_alerts else "none"
            lines.append(
                f"{i}. ID: {seg.id!r} | TRANSIT | {seg.description} | "
                f"{seg.distance_meters:.0f}m | vehicle={vehicle_type} | "
                f"route={route_name} | {dep_stop}→{arr_stop} | "
                f"accessibility note: {guidance} | alerts: {alert_str}"
            )
        else:
            lines.append(
                f"{i}. ID: {seg.id!r} | WALK | {seg.description} | "
                f"{seg.distance_meters:.0f}m | OSM: {osm_str}"
            )

    segments_block = "\n".join(lines)
    return f"""You are an accessibility expert scoring pedestrian and transit route segments.

User profile: {profile} — {profile_desc}
Response language: {language_code}

Scoring rules:
- LOW   (0.0–0.34): fully accessible for this profile — use when no barrier evidence exists
- MEDIUM(0.35–0.64): usable but with notable, specific challenges
- HIGH  (0.65–1.0): significant barrier — must have concrete evidence (stairs, narrow path, dirt, etc.)

CRITICAL — evidence requirement:
  * Assign MEDIUM or HIGH ONLY when you have specific evidence of a barrier from OSM tags or the
    step description itself (e.g. "highway=steps", "surface=gravel", "width=0.5", "Take the stairs").
  * Generic navigation instructions ("Turn right", "Continue", "Head north", "Slight left") with NO
    OSM data are NOT evidence of a barrier. Score them LOW (0.10–0.20) with confidence 0.20–0.30.
  * Missing OSM data alone is NOT a reason for MEDIUM. Absence of evidence ≠ evidence of barrier.

For WALK segments: prioritise OSM tags (surface, kerb, step_count, tactile_paving, width, incline).
For TRANSIT segments: score based on vehicle type, known accessibility guidance, and any service alerts.

Segments:
{segments_block}

Return ONLY a JSON array — one object per segment, same order as above:
[
  {{
    "id": "<exact segment id>",
    "frictionScore": <0.0-1.0>,
    "confidence": <0.0-1.0>,
    "reasons": ["<specific evidence-based reason, or empty array if no evidence>"],
    "recommendation": "<brief actionable advice in {language_code}, or empty string if no issues>"
  }}
]"""


def build_vision_prompt(
    seg_id: str,
    description: str,
    distance_meters: float,
    profile: str,
    language_code: str,
) -> str:
    """Build the vision-scoring prompt for a single suspicious segment."""
    profile_desc = PROFILE_DESCRIPTIONS.get(profile, profile)
    return f"""Assess this street/sidewalk image for pedestrian accessibility.

User profile: {profile} — {profile_desc}
Segment: {description} ({distance_meters:.0f}m)
Response language: {language_code}

Examine: surface material & condition, obstacles, stairs vs ramps, kerb cuts,
path width, tactile paving, lighting, signage visibility.

Return ONLY JSON:
{{
  "id": "{seg_id}",
  "frictionScore": <0.0-1.0>,
  "confidence": <0.0-1.0>,
  "reasons": ["<what you observe in the image>"],
  "recommendation": "<brief actionable advice in {language_code}>"
}}"""


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

async def _call_gemini(url: str, payload: dict) -> dict:
    """POST to Gemini with semaphore and rate-limit retry.

    If the model doesn't support responseMimeType (HTTP 400), retries once
    without it so the caller can still extract JSON from plain text.
    """
    sem = _get_semaphore()
    async with sem:
        for attempt in range(MAX_RETRIES + 1):
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, json=payload)

            if resp.status_code == 429 and attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)
                continue

            # Some Gemini models reject responseMimeType — strip it and retry once
            if resp.status_code == 400 and "responseMimeType" in payload.get("generationConfig", {}):
                fallback = {**payload, "generationConfig": {
                    k: v for k, v in payload["generationConfig"].items()
                    if k != "responseMimeType"
                }}
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(url, json=fallback)

            if not resp.is_success:
                # Surface the Gemini error detail so it's visible in server logs
                try:
                    detail = resp.json()
                except Exception:
                    detail = resp.text[:300]
                raise httpx.HTTPStatusError(
                    f"Gemini {resp.status_code}: {detail}",
                    request=resp.request,
                    response=resp,
                )
            return resp.json()
    raise RuntimeError("Gemini call failed after retries")  # unreachable


def _extract_text(response: dict) -> str:
    return response["candidates"][0]["content"]["parts"][0]["text"]


def _extract_json(text: str) -> str:
    """Strip markdown code fences Gemini sometimes wraps around JSON output.

    Handles:
      ```json\\n{...}\\n```
      ```\\n{...}\\n```
      plain {...} or [...]
    """
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Drop first line (``` or ```json) and last line (```)
        inner = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        text = "\n".join(inner).strip()
    return text


# ---------------------------------------------------------------------------
# Public scoring functions
# ---------------------------------------------------------------------------

async def score_batch(
    segments: list,
    profile: str,
    language_code: str,
    osm_tags: dict[str, dict],
    model: str,
    api_key: str,
    alerts: dict[str, list[str]] | None = None,
) -> list[dict]:
    """Score up to BATCH_SIZE segments in a single Gemini text call.

    Returns a list of raw dicts (id, frictionScore, confidence, reasons, recommendation).
    Raises on HTTP or JSON parse failure so the caller can handle per-batch errors.
    """
    prompt = build_batch_prompt(segments, profile, language_code, osm_tags, alerts=alerts)
    url = GEMINI_URL.format(model=model, key=api_key)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    data = await _call_gemini(url, payload)
    results = json.loads(_extract_json(_extract_text(data)))
    if not isinstance(results, list):
        raise ValueError(f"Expected JSON array from Gemini, got {type(results).__name__}")
    return results


async def score_with_vision(
    seg_id: str,
    description: str,
    distance_meters: float,
    image_bytes: bytes,
    profile: str,
    language_code: str,
    model: str,
    api_key: str,
) -> dict:
    """Score a single segment using a Street View image (Gemini Vision).

    Returns a raw dict (id, frictionScore, confidence, reasons, recommendation).
    """
    prompt = build_vision_prompt(seg_id, description, distance_meters, profile, language_code)
    url = GEMINI_URL.format(model=model, key=api_key)
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64.b64encode(image_bytes).decode(),
                }},
            ]
        }],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    data = await _call_gemini(url, payload)
    return json.loads(_extract_json(_extract_text(data)))
