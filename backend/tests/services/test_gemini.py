"""Unit tests for services/gemini.py."""
import json
import pytest
import respx
import httpx

from services import gemini
from services.gemini import (
    build_batch_prompt,
    build_vision_prompt,
    score_batch,
    score_with_vision,
    GEMINI_URL,
    BATCH_SIZE,
    SUSPICIOUS_SCORE_THRESHOLD,
    SUSPICIOUS_CONFIDENCE_THRESHOLD,
)
from tests.conftest import GEMINI_BATCH_LOW, GEMINI_BATCH_HIGH, GEMINI_VISION_RESPONSE


# ---------------------------------------------------------------------------
# Prompt builders (pure functions)
# ---------------------------------------------------------------------------

class TestBuildBatchPrompt:
    class _FakeSeg:
        def __init__(self, seg_id, desc, dist):
            self.id = seg_id
            self.description = desc
            self.distance_meters = dist

    def test_contains_profile_description(self):
        segs = [self._FakeSeg("s1", "Head north", 100)]
        prompt = build_batch_prompt(segs, "wheelchair", "en", {})
        assert "wheelchair" in prompt
        assert "ramp" in prompt.lower()

    def test_contains_osm_tags_when_present(self):
        segs = [self._FakeSeg("s1", "Steps near library", 40)]
        osm = {"s1": {"highway": "steps", "step_count": "12"}}
        prompt = build_batch_prompt(segs, "wheelchair", "en", osm)
        assert "highway=steps" in prompt
        assert "step_count=12" in prompt

    def test_fallback_text_when_no_osm_tags(self):
        segs = [self._FakeSeg("s1", "Some path", 50)]
        prompt = build_batch_prompt(segs, "stroller", "en", {})
        assert "no OSM data" in prompt

    def test_all_segment_ids_included(self):
        segs = [self._FakeSeg(f"s{i}", f"Step {i}", 100) for i in range(4)]
        prompt = build_batch_prompt(segs, "low-vision", "es", {})
        for i in range(4):
            assert f"s{i}" in prompt

    def test_language_code_in_prompt(self):
        segs = [self._FakeSeg("s1", "Path", 50)]
        prompt = build_batch_prompt(segs, "wheelchair", "fr", {})
        assert "fr" in prompt

    def test_constants_exposed(self):
        assert BATCH_SIZE == 6
        assert SUSPICIOUS_SCORE_THRESHOLD == pytest.approx(0.65)
        assert SUSPICIOUS_CONFIDENCE_THRESHOLD == pytest.approx(0.70)


class TestBuildVisionPrompt:
    def test_contains_segment_id(self):
        prompt = build_vision_prompt("seg-42", "Steps", 40, "wheelchair", "en")
        assert "seg-42" in prompt

    def test_contains_profile(self):
        prompt = build_vision_prompt("s1", "Path", 100, "low-vision", "en")
        assert "low-vision" in prompt

    def test_returns_json_instruction(self):
        prompt = build_vision_prompt("s1", "Path", 100, "stroller", "en")
        assert "JSON" in prompt


# ---------------------------------------------------------------------------
# score_batch (mocked HTTP)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestScoreBatch:
    class _FakeSeg:
        def __init__(self, seg_id):
            self.id = seg_id
            self.description = "Test step"
            self.distance_meters = 100.0

    def _gemini_url_pattern(self):
        return respx.post(url__startswith="https://generativelanguage.googleapis.com")

    @respx.mock
    async def test_returns_list_of_scores(self):
        self._gemini_url_pattern().mock(
            return_value=httpx.Response(200, json=GEMINI_BATCH_LOW)
        )
        segs = [self._FakeSeg("r0s0")]
        results = await score_batch(segs, "wheelchair", "en", {}, "gemini-model", "key")
        assert isinstance(results, list)
        assert results[0]["id"] == "r0s0"
        assert results[0]["frictionScore"] == pytest.approx(0.2)

    @respx.mock
    async def test_raises_on_http_error(self):
        self._gemini_url_pattern().mock(
            return_value=httpx.Response(500, text="internal error")
        )
        segs = [self._FakeSeg("s1")]
        with pytest.raises(httpx.HTTPStatusError):
            await score_batch(segs, "wheelchair", "en", {}, "model", "key")

    @respx.mock
    async def test_raises_on_non_list_response(self):
        bad_response = {
            "candidates": [{"content": {"parts": [{"text": '{"error": "bad"}'}]}}]
        }
        self._gemini_url_pattern().mock(
            return_value=httpx.Response(200, json=bad_response)
        )
        segs = [self._FakeSeg("s1")]
        with pytest.raises(ValueError, match="Expected JSON array"):
            await score_batch(segs, "wheelchair", "en", {}, "model", "key")

    @respx.mock
    async def test_retries_on_429(self):
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(429, text="rate limited")
            return httpx.Response(200, json=GEMINI_BATCH_LOW)

        self._gemini_url_pattern().mock(side_effect=side_effect)
        segs = [self._FakeSeg("r0s0")]
        results = await score_batch(segs, "wheelchair", "en", {}, "model", "key")
        assert call_count == 2
        assert results[0]["id"] == "r0s0"


# ---------------------------------------------------------------------------
# score_with_vision (mocked HTTP)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestScoreWithVision:
    FAKE_JPEG = b"\xff\xd8\xff\xe0fake"

    def _gemini_url_pattern(self):
        return respx.post(url__startswith="https://generativelanguage.googleapis.com")

    @respx.mock
    async def test_returns_vision_score(self):
        self._gemini_url_pattern().mock(
            return_value=httpx.Response(200, json=GEMINI_VISION_RESPONSE)
        )
        result = await score_with_vision(
            "r0s1", "Steps", 40.0, self.FAKE_JPEG,
            "wheelchair", "en", "model", "key"
        )
        assert result["id"] == "r0s1"
        assert result["frictionScore"] == pytest.approx(0.88)
        assert result["confidence"] >= 0.9

    @respx.mock
    async def test_image_sent_as_base64(self):
        captured: list[dict] = []

        def capture(request):
            captured.append(json.loads(request.content))
            return httpx.Response(200, json=GEMINI_VISION_RESPONSE)

        self._gemini_url_pattern().mock(side_effect=capture)
        await score_with_vision(
            "s1", "Path", 50.0, self.FAKE_JPEG,
            "stroller", "en", "model", "key"
        )
        parts = captured[0]["contents"][0]["parts"]
        inline = next(p for p in parts if "inline_data" in p)
        assert inline["inline_data"]["mime_type"] == "image/jpeg"
        assert len(inline["inline_data"]["data"]) > 0
