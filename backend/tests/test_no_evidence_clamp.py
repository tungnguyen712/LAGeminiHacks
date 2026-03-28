"""Tests for the no-evidence score clamp in constants.py and friction router."""
import pytest
import respx
import httpx
import json

from constants import is_no_evidence_segment, clamp_no_evidence_score
from fastapi.testclient import TestClient
from main import app
from services.google_maps import ROUTES_API_URL
from services.gemini import GEMINI_URL
from tests.conftest import (
    MAPS_ONE_ROUTE_RESPONSE,
    make_gemini_batch_response,
    OVERPASS_RESPONSE,
)

client = TestClient(app)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


# ---------------------------------------------------------------------------
# is_no_evidence_segment (pure)
# ---------------------------------------------------------------------------

class TestIsNoEvidenceSegment:
    def test_generic_turn_no_osm(self):
        assert is_no_evidence_segment("Turn right", {}) is True

    def test_generic_continue_no_osm(self):
        assert is_no_evidence_segment("Continue onto Main St", {}) is True

    def test_generic_head_no_osm(self):
        assert is_no_evidence_segment("Head north on Broadway", {}) is True

    def test_slight_left_no_osm(self):
        assert is_no_evidence_segment("Slight left toward Sunset Blvd", {}) is True

    def test_destination_no_osm(self):
        assert is_no_evidence_segment("Destination will be on the left", {}) is True

    def test_stairs_in_description_not_no_evidence(self):
        assert is_no_evidence_segment("Turn left\nTake the stairs", {}) is False

    def test_step_keyword_not_no_evidence(self):
        assert is_no_evidence_segment("Continue up steps to entrance", {}) is False

    def test_steep_keyword_not_no_evidence(self):
        assert is_no_evidence_segment("Turn right onto steep hill", {}) is False

    def test_narrow_keyword_not_no_evidence(self):
        assert is_no_evidence_segment("Continue on narrow path", {}) is False

    def test_osm_surface_tag_not_no_evidence(self):
        assert is_no_evidence_segment("Turn right", {"surface": "gravel"}) is False

    def test_osm_kerb_tag_not_no_evidence(self):
        assert is_no_evidence_segment("Continue", {"kerb": "raised"}) is False

    def test_osm_highway_tag_alone_not_enough(self):
        # highway=footway is a very generic tag — shouldn't prevent clamp
        # (no meaningful tag intersection with {"surface", "barrier", ...})
        assert is_no_evidence_segment("Turn left", {"highway": "footway"}) is True

    def test_non_nav_description_not_clamped(self):
        # A description that doesn't start with a generic prefix isn't no-evidence
        assert is_no_evidence_segment("Walk across the bridge", {}) is False


# ---------------------------------------------------------------------------
# clamp_no_evidence_score (pure)
# ---------------------------------------------------------------------------

class TestClampNoEvidenceScore:
    def test_medium_low_conf_clamped(self):
        result = clamp_no_evidence_score(0.50, 0.30)
        assert result == pytest.approx(0.12)

    def test_boundary_score_low_end_clamped(self):
        assert clamp_no_evidence_score(0.28, 0.40) == pytest.approx(0.12)

    def test_boundary_score_high_end_clamped(self):
        assert clamp_no_evidence_score(0.62, 0.44) == pytest.approx(0.12)

    def test_high_confidence_not_clamped(self):
        # conf > 0.45 → Gemini was sure → trust it
        assert clamp_no_evidence_score(0.50, 0.50) is None

    def test_low_score_not_in_range(self):
        # Already LOW — nothing to clamp
        assert clamp_no_evidence_score(0.10, 0.30) is None

    def test_high_score_not_in_range(self):
        # Already HIGH — Gemini had evidence
        assert clamp_no_evidence_score(0.75, 0.30) is None


# ---------------------------------------------------------------------------
# Integration: friction endpoint applies clamp
# ---------------------------------------------------------------------------

@respx.mock
def test_friction_clamps_generic_no_evidence_segments():
    """Generic "Turn right" with no OSM data and conf 0.30 → clamped to LOW."""
    # Gemini returns MEDIUM (0.50) with 30% confidence for a generic step
    gemini_resp = make_gemini_batch_response([
        {"id": "r0s0", "frictionScore": 0.50, "confidence": 0.30,
         "reasons": ["No OSM data available"], "recommendation": ""},
    ])
    respx.post(ROUTES_API_URL).mock(return_value=httpx.Response(200, json={"routes": []}))
    respx.post(OVERPASS_URL).mock(return_value=httpx.Response(200, json={"elements": []}))
    respx.post(url__regex=r".*generativelanguage\.googleapis\.com.*").mock(
        return_value=httpx.Response(200, json=gemini_resp)
    )

    resp = client.post("/api/friction", json={
        "segments": [{
            "id": "r0s0",
            "description": "Turn right",
            "distanceMeters": 50,
            "segmentType": "walk",
            "startLat": 34.07, "startLng": -118.44,
            "endLat": 34.071, "endLng": -118.441,
        }],
        "profile": "wheelchair",
        "languageCode": "en",
    })
    assert resp.status_code == 200
    sc = resp.json()["scores"]["r0s0"]
    assert sc["level"] == "LOW"
    assert sc["frictionScore"] == pytest.approx(0.12)
    assert sc["reasons"] == []


@respx.mock
def test_friction_does_not_clamp_hazard_segments():
    """A segment with stairs in description keeps its HIGH score."""
    gemini_resp = make_gemini_batch_response([
        {"id": "r0s1", "frictionScore": 0.50, "confidence": 0.30,
         "reasons": ["stairs present"], "recommendation": "avoid"},
    ])
    respx.post(ROUTES_API_URL).mock(return_value=httpx.Response(200, json={"routes": []}))
    respx.post(OVERPASS_URL).mock(return_value=httpx.Response(200, json={"elements": []}))
    respx.post(url__regex=r".*generativelanguage\.googleapis\.com.*").mock(
        return_value=httpx.Response(200, json=gemini_resp)
    )

    resp = client.post("/api/friction", json={
        "segments": [{
            "id": "r0s1",
            "description": "Turn left\nTake the stairs",
            "distanceMeters": 30,
            "segmentType": "walk",
            "startLat": 34.07, "startLng": -118.44,
            "endLat": 34.071, "endLng": -118.441,
        }],
        "profile": "wheelchair",
        "languageCode": "en",
    })
    assert resp.status_code == 200
    sc = resp.json()["scores"]["r0s1"]
    # Not clamped — "stairs" is a hazard keyword
    assert sc["frictionScore"] == pytest.approx(0.50)
