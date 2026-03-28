"""POST /api/friction

Scores each segment for accessibility friction using a three-stage pipeline:

  Stage 1 — OSM enrichment (parallel with nothing, one Overpass query per call)
    Fetch accessibility tags (surface, wheelchair, kerb, …) for the bounding
    box of all segments. Free, no key required.

  Stage 2 — Batch text scoring (all batches run in parallel)
    Group segments into batches of BATCH_SIZE (6). Each batch → one Gemini
    call that returns structured JSON for all segments in the batch.
    OSM tags are embedded in the prompt as primary evidence.

  Stage 3 — Vision re-scoring for suspicious segments (parallel)
    Segments where frictionScore ≥ 0.65 OR confidence < 0.70 are re-scored
    using a Street View image passed as inline data to Gemini Vision.
    The vision score overrides the batch score (higher evidence quality).

Total Gemini calls: ceil(N/6) batch calls + K vision calls  (K ≤ N)
Typical wall time for 3 routes × 10 steps:  ~4–5 s with parallelism.
"""
import asyncio
import hashlib

from fastapi import APIRouter

from config import settings
from constants import score_to_level, is_no_evidence_segment, clamp_no_evidence_score
from models import FrictionRequest, FrictionResponse, FrictionScoreResponse, SegmentIn
from services import gemini, la_metro, overpass, street_view

router = APIRouter()

BATCH_SIZE = gemini.BATCH_SIZE

# ---------------------------------------------------------------------------
# In-memory friction score cache
# Key: md5 of (seg_id + description + coords + profile + language_code)
# Value: fully-resolved FrictionScoreResponse (post-clamp, post-vision)
# ---------------------------------------------------------------------------
_score_cache: dict[str, FrictionScoreResponse] = {}


def _cache_key(seg: SegmentIn, profile: str, language_code: str) -> str:
    raw = f"{seg.id}|{seg.description}|{seg.start_lat}|{seg.start_lng}|{seg.end_lat}|{seg.end_lng}|{profile}|{language_code}"
    return hashlib.md5(raw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _has_coords(seg: SegmentIn) -> bool:
    return None not in (seg.start_lat, seg.start_lng, seg.end_lat, seg.end_lng)


def _midpoint(seg: SegmentIn) -> tuple[float, float]:
    return (
        (seg.start_lat + seg.end_lat) / 2,   # type: ignore[operator]
        (seg.start_lng + seg.end_lng) / 2,   # type: ignore[operator]
    )


def _parse_score(raw: dict, seg_id: str) -> FrictionScoreResponse:
    raw_score = float(raw.get("frictionScore", 0.5))
    return FrictionScoreResponse(
        friction_score=raw_score,
        confidence=float(raw.get("confidence", 0.5)),
        reasons=raw.get("reasons", []),
        recommendation=raw.get("recommendation", ""),
        level=score_to_level(raw_score),
    )


# ---------------------------------------------------------------------------
# Stage 3 helper: fetch Street View + Vision score for one segment
# ---------------------------------------------------------------------------

async def _vision_rescore(
    seg: SegmentIn,
    model: str,
    api_key: str,
    language_code: str,
    profile: str,
) -> tuple[str, FrictionScoreResponse | None]:
    """Return (seg_id, vision_score) or (seg_id, None) if Street View unavailable."""
    mid_lat, mid_lng = _midpoint(seg)
    image = await street_view.fetch_street_view_image(mid_lat, mid_lng, api_key)
    if image is None:
        return seg.id, None
    try:
        raw = await gemini.score_with_vision(
            seg_id=seg.id,
            description=seg.description,
            distance_meters=seg.distance_meters,
            image_bytes=image,
            profile=profile,
            language_code=language_code,
            model=model,
            api_key=api_key,
        )
        return seg.id, _parse_score(raw, seg.id)
    except Exception as exc:
        # Vision failure is non-fatal — keep the batch score
        print(f"[friction] Vision rescore failed for {seg.id}: {exc}")
        return seg.id, None


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/friction", response_model=FrictionResponse)
async def get_friction(req: FrictionRequest) -> dict:
    scores: dict[str, FrictionScoreResponse] = {}

    # ------------------------------------------------------------------ #
    # Cache — return already-scored segments immediately                  #
    # ------------------------------------------------------------------ #
    cache_keys = {s.id: _cache_key(s, req.profile, req.language_code) for s in req.segments}
    uncached_segments = [s for s in req.segments if cache_keys[s.id] not in _score_cache]

    for seg in req.segments:
        cached = _score_cache.get(cache_keys[seg.id])
        if cached is not None:
            scores[seg.id] = cached

    if not uncached_segments:
        return FrictionResponse(scores=scores).model_dump(by_alias=True)

    # ------------------------------------------------------------------ #
    # Stage 0 — Parallel pre-fetch: OSM + LA Metro alerts                #
    # ------------------------------------------------------------------ #
    segs_with_coords = [s for s in uncached_segments if _has_coords(s)]
    osm_tags: dict[str, dict] = {}

    # Fetch LA Metro alerts concurrently with OSM (non-fatal)
    try:
        service_alerts = await la_metro.get_service_alerts()
    except Exception:
        service_alerts = {}

    if segs_with_coords:
        bbox_input = [
            {"startLat": s.start_lat, "startLng": s.start_lng,
             "endLat": s.end_lat, "endLng": s.end_lng}
            for s in segs_with_coords
        ]
        bbox = overpass.compute_bbox(bbox_input)
        elements = await overpass.fetch_accessibility_features(bbox)
        for seg in segs_with_coords:
            mid_lat, mid_lng = _midpoint(seg)
            osm_tags[seg.id] = overpass.match_tags_to_segment(mid_lat, mid_lng, elements)

    # ------------------------------------------------------------------ #
    # Stage 2 — Parallel batch text scoring                               #
    # ------------------------------------------------------------------ #
    batches = [
        uncached_segments[i: i + BATCH_SIZE]
        for i in range(0, len(uncached_segments), BATCH_SIZE)
    ]

    batch_results = await asyncio.gather(
        *[
            gemini.score_batch(
                segments=batch,
                profile=req.profile,
                language_code=req.language_code,
                osm_tags=osm_tags,
                model=settings.gemini_scoring_model,
                api_key=settings.gemini_api_key,
                alerts=service_alerts,
            )
            for batch in batches
        ],
        return_exceptions=True,
    )

    batch_errors: list[str] = []
    for result in batch_results:
        if isinstance(result, Exception):
            msg = str(result)
            batch_errors.append(msg)
            print(f"[friction] Batch scoring error: {msg}")
            continue
        for item in result:
            seg_id = item.get("id")
            if seg_id:
                scores[seg_id] = _parse_score(item, seg_id)

    # If every batch failed, surface the error rather than silently returning {}
    if batch_errors and not scores:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Gemini scoring failed for all batches — check GEMINI_API_KEY and GEMINI_SCORING_MODEL in .env",
                "errors": batch_errors,
            },
        )

    # ------------------------------------------------------------------ #
    # Stage 2b — No-evidence clamp                                         #
    # ------------------------------------------------------------------ #
    # Walk segments where Gemini produced a MEDIUM guess with no supporting
    # evidence are clamped to LOW.  This prevents generic "Turn right"
    # navigation instructions from appearing as noise-level MEDIUM friction.
    seg_lookup = {s.id: s for s in uncached_segments}
    for seg_id, sc in list(scores.items()):
        seg = seg_lookup.get(seg_id)
        if seg is None or getattr(seg, "segment_type", "walk") != "walk":
            continue
        if not is_no_evidence_segment(seg.description, osm_tags.get(seg_id, {})):
            continue
        clamped = clamp_no_evidence_score(sc.friction_score, sc.confidence)
        if clamped is not None:
            scores[seg_id] = FrictionScoreResponse(
                friction_score=clamped,
                confidence=sc.confidence,
                reasons=[],        # no evidence → no reasons to show
                recommendation="",
                level=score_to_level(clamped),
            )

    # ------------------------------------------------------------------ #
    # Stage 3 — Vision re-score suspicious segments                       #
    # ------------------------------------------------------------------ #
    suspicious = [
        seg for seg in uncached_segments
        if _has_coords(seg) and seg.id in scores and (
            scores[seg.id].friction_score >= gemini.SUSPICIOUS_SCORE_THRESHOLD
            or scores[seg.id].confidence < gemini.SUSPICIOUS_CONFIDENCE_THRESHOLD
        )
    ]

    if suspicious:
        vision_results = await asyncio.gather(
            *[
                _vision_rescore(
                    seg=seg,
                    model=settings.gemini_scoring_model,
                    api_key=settings.google_maps_api_key,  # Street View uses Maps key
                    language_code=req.language_code,
                    profile=req.profile,
                )
                for seg in suspicious
            ],
            return_exceptions=True,
        )
        for outcome in vision_results:
            if isinstance(outcome, Exception):
                print(f"[friction] Vision gather error: {outcome}")
                continue
            seg_id, vision_score = outcome
            if vision_score is not None:
                scores[seg_id] = vision_score  # override with richer visual evidence

    # ------------------------------------------------------------------ #
    # Store freshly-scored segments in cache                              #
    # ------------------------------------------------------------------ #
    for seg in uncached_segments:
        if seg.id in scores:
            _score_cache[cache_keys[seg.id]] = scores[seg.id]

    return FrictionResponse(scores=scores).model_dump(by_alias=True)
