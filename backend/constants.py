# ---------------------------------------------------------------------------
# No-evidence clamp — applied after Gemini scoring
# ---------------------------------------------------------------------------
# Keywords in a segment description that indicate a real physical barrier.
# If any of these are present, we trust Gemini's score even if confidence is low.
HAZARD_KEYWORDS: frozenset[str] = frozenset([
    "stair", "step", "steep", "narrow", "gravel", "dirt", "unpaved", "uneven",
    "cobble", "construction", "slope", "incline", "barrier", "gate",
    "cross", "ramp", "curb", "kerb", "pothole", "loose", "mud", "sand",
])

# Prefixes that identify a generic navigation instruction with no physical context
_GENERIC_NAV_PREFIXES: tuple[str, ...] = (
    "turn ", "head ", "continue", "slight ", "sharp ", "keep ", "merge ",
    "exit ", "take the ", "destination",
)

# Score/confidence range where a "no evidence" guess lands
_CLAMP_SCORE_LO  = 0.28
_CLAMP_SCORE_HI  = 0.62
_CLAMP_CONF_MAX  = 0.45
_CLAMP_TARGET    = 0.12   # override value — clearly LOW


def is_no_evidence_segment(description: str, osm_tags: dict) -> bool:
    """Return True if this segment has only generic navigation text and no OSM hazard data.

    Used to identify segments where Gemini's MEDIUM score is a guess, not evidence.
    """
    desc_lower = description.lower()

    # If the description mentions a known hazard word, it IS evidence
    if any(kw in desc_lower for kw in HAZARD_KEYWORDS):
        return False

    # Must look like a generic nav instruction
    if not any(desc_lower.startswith(prefix) for prefix in _GENERIC_NAV_PREFIXES):
        return False

    # If OSM provided relevant infrastructure tags, Gemini had real data
    if osm_tags:
        meaningful_tags = {"surface", "barrier", "step_count", "incline", "width",
                           "tactile_paving", "wheelchair", "kerb", "smoothness"}
        if meaningful_tags & set(osm_tags.keys()):
            return False

    return True


def clamp_no_evidence_score(score: float, confidence: float) -> float | None:
    """Return a clamped score if this looks like a no-evidence MEDIUM guess, else None.

    Caller should only invoke this after confirming is_no_evidence_segment().
    """
    if _CLAMP_SCORE_LO <= score <= _CLAMP_SCORE_HI and confidence <= _CLAMP_CONF_MAX:
        return _CLAMP_TARGET
    return None


def build_friction_prompt(
    profile: str,
    language_code: str,
    segment_description: str,
    distance_meters: float,
) -> str:
    profile_descriptions = {
        "wheelchair": "uses a wheelchair, needs ramps, avoids stairs and steep slopes",
        "low-vision": "has low vision, needs well-lit paths and tactile indicators",
        "stroller": "pushing a stroller, needs smooth surfaces and ramp access",
    }
    desc = profile_descriptions.get(profile, profile)
    return f"""You are an accessibility expert. Given route segment data and a user profile, return a JSON friction assessment.

Profile: {profile} ({desc})
Language: {language_code}
Segment: {segment_description}
Distance: {distance_meters:.0f} meters

Respond ONLY with valid JSON:
{{
  "frictionScore": <0.0-1.0>,
  "confidence": <0.0-1.0>,
  "reasons": ["..."],
  "recommendation": "..."
}}"""


def score_to_level(score: float) -> str:
    if score < 0.35:
        return "LOW"
    if score < 0.65:
        return "MEDIUM"
    return "HIGH"
