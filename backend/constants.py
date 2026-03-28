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
