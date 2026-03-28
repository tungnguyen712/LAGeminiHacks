"""Integration tests for POST /api/friction."""
import json
import pytest
import respx
import httpx
from fastapi.testclient import TestClient

from main import app
from services.google_maps import ROUTES_API_URL
from services.overpass import OVERPASS_URL
from services.street_view import METADATA_URL, IMAGE_URL
from tests.conftest import OVERPASS_RESPONSE, GEMINI_BATCH_LOW, GEMINI_BATCH_HIGH, GEMINI_VISION_RESPONSE

client = TestClient(app)

GEMINI_URL_PREFIX = "https://generativelanguage.googleapis.com"
FAKE_JPEG = b"\xff\xd8\xff\xe0fake-jpeg"

# ---------------------------------------------------------------------------
# Shared segment fixtures
# ---------------------------------------------------------------------------

SEG_LOW = {
    "id": "r0s0",
    "description": "Head north on Bruin Walk",
    "distanceMeters": 320,
    "startLat": 34.0706,
    "startLng": -118.4434,
    "endLat": 34.0681,
    "endLng": -118.4414,
}

SEG_HIGH = {
    "id": "r0s1",
    "description": "Turn right up steps to Powell Library",
    "distanceMeters": 230,
    "startLat": 34.0681,
    "startLng": -118.4414,
    "endLat": 34.0697,
    "endLng": -118.4421,
}

SEG_NO_COORDS = {
    "id": "r0s2",
    "description": "Continue on path",
    "distanceMeters": 100,
    # no coordinates — should still score via text only
}


def _gemini_mock(response_json: dict):
    return respx.post(url__startswith=GEMINI_URL_PREFIX).mock(
        return_value=httpx.Response(200, json=response_json)
    )


def _overpass_mock():
    return respx.post(OVERPASS_URL).mock(
        return_value=httpx.Response(200, json=OVERPASS_RESPONSE)
    )


def _sv_no_panorama():
    respx.get(METADATA_URL).mock(
        return_value=httpx.Response(200, json={"status": "ZERO_RESULTS"})
    )


def _sv_with_image():
    respx.get(METADATA_URL).mock(
        return_value=httpx.Response(200, json={"status": "OK"})
    )
    respx.get(IMAGE_URL).mock(
        return_value=httpx.Response(200, content=FAKE_JPEG)
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGetFriction:

    @respx.mock
    def test_low_friction_segment_scores_correctly(self):
        _overpass_mock()
        _gemini_mock(GEMINI_BATCH_LOW)
        _sv_no_panorama()

        resp = client.post("/api/friction", json={
            "segments": [SEG_LOW],
            "profile": "wheelchair",
            "languageCode": "en",
        })
        assert resp.status_code == 200
        scores = resp.json()["scores"]
        assert "r0s0" in scores
        assert scores["r0s0"]["frictionScore"] == pytest.approx(0.2)
        assert scores["r0s0"]["level"] == "LOW"

    @respx.mock
    def test_high_friction_triggers_vision_rescore(self):
        _overpass_mock()

        call_count = 0

        def gemini_side_effect(request):
            nonlocal call_count
            call_count += 1
            # First call = batch text → HIGH score
            if call_count == 1:
                return httpx.Response(200, json=GEMINI_BATCH_HIGH)
            # Second call = vision → even higher confidence
            return httpx.Response(200, json=GEMINI_VISION_RESPONSE)

        respx.post(url__startswith=GEMINI_URL_PREFIX).mock(side_effect=gemini_side_effect)
        _sv_with_image()

        resp = client.post("/api/friction", json={
            "segments": [SEG_HIGH],
            "profile": "wheelchair",
            "languageCode": "en",
        })
        assert resp.status_code == 200
        # Vision should have overridden with score 0.88
        score = resp.json()["scores"]["r0s1"]
        assert score["frictionScore"] == pytest.approx(0.88)
        assert call_count == 2  # batch + vision

    @respx.mock
    def test_vision_skipped_when_no_panorama(self):
        _overpass_mock()

        call_count = 0

        def gemini_side_effect(request):
            nonlocal call_count
            call_count += 1
            return httpx.Response(200, json=GEMINI_BATCH_HIGH)

        respx.post(url__startswith=GEMINI_URL_PREFIX).mock(side_effect=gemini_side_effect)
        _sv_no_panorama()

        resp = client.post("/api/friction", json={
            "segments": [SEG_HIGH],
            "profile": "wheelchair",
            "languageCode": "en",
        })
        assert resp.status_code == 200
        # Batch score kept since no Street View available
        score = resp.json()["scores"]["r0s1"]
        assert score["frictionScore"] == pytest.approx(0.85)
        assert call_count == 1  # only batch, no vision

    @respx.mock
    def test_segment_without_coords_still_scored(self):
        """Segments with no coordinates skip OSM + Street View but still get text scored."""
        # No Overpass call expected since no coords
        batch_response = {
            "candidates": [{"content": {"parts": [{"text": json.dumps([
                {"id": "r0s2", "frictionScore": 0.3, "confidence": 0.7,
                 "reasons": ["Paved path"], "recommendation": "OK"}
            ])}]}}]
        }
        respx.post(url__startswith=GEMINI_URL_PREFIX).mock(
            return_value=httpx.Response(200, json=batch_response)
        )

        resp = client.post("/api/friction", json={
            "segments": [SEG_NO_COORDS],
            "profile": "stroller",
            "languageCode": "en",
        })
        assert resp.status_code == 200
        assert "r0s2" in resp.json()["scores"]

    @respx.mock
    def test_response_is_camel_case(self):
        _overpass_mock()
        _gemini_mock(GEMINI_BATCH_LOW)
        _sv_no_panorama()

        resp = client.post("/api/friction", json={
            "segments": [SEG_LOW],
            "profile": "wheelchair",
            "languageCode": "en",
        })
        score = resp.json()["scores"]["r0s0"]
        assert "frictionScore" in score    # camelCase
        assert "friction_score" not in score  # NOT snake_case

    @respx.mock
    def test_multiple_segments_all_scored(self):
        _overpass_mock()

        batch_both = {
            "candidates": [{"content": {"parts": [{"text": json.dumps([
                {"id": "r0s0", "frictionScore": 0.2, "confidence": 0.9,
                 "reasons": ["Wide path"], "recommendation": "Good"},
                {"id": "r0s1", "frictionScore": 0.85, "confidence": 0.95,
                 "reasons": ["Steps"], "recommendation": "Avoid"},
            ])}]}}]
        }
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(200, json=batch_both)
            return httpx.Response(200, json=GEMINI_VISION_RESPONSE)

        respx.post(url__startswith=GEMINI_URL_PREFIX).mock(side_effect=side_effect)
        _sv_with_image()

        resp = client.post("/api/friction", json={
            "segments": [SEG_LOW, SEG_HIGH],
            "profile": "wheelchair",
            "languageCode": "en",
        })
        assert resp.status_code == 200
        scores = resp.json()["scores"]
        assert "r0s0" in scores
        assert "r0s1" in scores

    @respx.mock
    def test_partial_batch_failure_returns_available_scores(self):
        """If one Gemini batch fails, other batches' scores are still returned."""
        _overpass_mock()
        _sv_no_panorama()

        # Produce 7 segments (crosses BATCH_SIZE=6 boundary → 2 batches)
        segments = [
            {
                "id": f"s{i}",
                "description": f"Step {i}",
                "distanceMeters": 50,
                "startLat": 34.07 + i * 0.0001,
                "startLng": -118.44,
                "endLat": 34.071 + i * 0.0001,
                "endLng": -118.439,
            }
            for i in range(7)
        ]

        batch1_items = [
            {"id": f"s{i}", "frictionScore": 0.2, "confidence": 0.9,
             "reasons": ["OK"], "recommendation": "Fine"}
            for i in range(6)
        ]
        batch1 = {"candidates": [{"content": {"parts": [{"text": json.dumps(batch1_items)}]}}]}

        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(200, json=batch1)   # batch 1 succeeds
            return httpx.Response(500, text="error")       # batch 2 fails

        respx.post(url__startswith=GEMINI_URL_PREFIX).mock(side_effect=side_effect)

        resp = client.post("/api/friction", json={
            "segments": segments,
            "profile": "wheelchair",
            "languageCode": "en",
        })
        assert resp.status_code == 200
        scores = resp.json()["scores"]
        # First 6 segments should be scored; s6 (batch 2) may be missing
        for i in range(6):
            assert f"s{i}" in scores

    @respx.mock
    def test_spanish_language_code_accepted(self):
        _overpass_mock()
        _gemini_mock(GEMINI_BATCH_LOW)
        _sv_no_panorama()

        resp = client.post("/api/friction", json={
            "segments": [SEG_LOW],
            "profile": "low-vision",
            "languageCode": "es",
        })
        assert resp.status_code == 200

    def test_missing_segments_returns_422(self):
        resp = client.post("/api/friction", json={
            "profile": "wheelchair",
            "languageCode": "en",
        })
        assert resp.status_code == 422

    def test_empty_segments_returns_empty_scores(self):
        resp = client.post("/api/friction", json={
            "segments": [],
            "profile": "wheelchair",
            "languageCode": "en",
        })
        assert resp.status_code == 200
        assert resp.json()["scores"] == {}
