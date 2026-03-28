"""Unit tests for services/overpass.py."""
import pytest
import respx
import httpx

from services.overpass import (
    compute_bbox,
    fetch_accessibility_features,
    match_tags_to_segment,
    OVERPASS_URL,
)
from tests.conftest import OVERPASS_RESPONSE


# ---------------------------------------------------------------------------
# compute_bbox
# ---------------------------------------------------------------------------

class TestComputeBbox:
    SEGMENTS = [
        {"startLat": 34.07, "startLng": -118.44, "endLat": 34.068, "endLng": -118.441},
        {"startLat": 34.069, "startLng": -118.443, "endLat": 34.071, "endLng": -118.442},
    ]

    def test_covers_all_coordinates(self):
        min_lat, min_lng, max_lat, max_lng = compute_bbox(self.SEGMENTS, buffer_deg=0)
        assert min_lat == pytest.approx(34.068)
        assert max_lat == pytest.approx(34.071)
        assert min_lng == pytest.approx(-118.443)
        # -118.44 is the most easterly (least negative) longitude in the set
        assert max_lng == pytest.approx(-118.44)

    def test_buffer_expands_bbox(self):
        buf = 0.001
        min_lat, min_lng, max_lat, max_lng = compute_bbox(self.SEGMENTS, buffer_deg=buf)
        assert min_lat == pytest.approx(34.068 - buf)
        assert max_lat == pytest.approx(34.071 + buf)

    def test_single_segment(self):
        segs = [{"startLat": 34.0, "startLng": -118.0, "endLat": 34.001, "endLng": -118.001}]
        min_lat, min_lng, max_lat, max_lng = compute_bbox(segs, buffer_deg=0)
        assert min_lat == pytest.approx(34.0)
        assert max_lat == pytest.approx(34.001)


# ---------------------------------------------------------------------------
# match_tags_to_segment
# ---------------------------------------------------------------------------

class TestMatchTagsToSegment:
    ELEMENTS = OVERPASS_RESPONSE["elements"]

    def test_matches_steps_near_powell(self):
        # Steps element is at (34.06815, -118.4415)
        tags = match_tags_to_segment(34.06815, -118.4415, self.ELEMENTS)
        assert tags.get("highway") == "steps"
        assert tags.get("step_count") == "12"

    def test_matches_kerb_near_bruin_walk(self):
        tags = match_tags_to_segment(34.07065, -118.44335, self.ELEMENTS)
        assert tags.get("kerb") == "lowered"

    def test_no_match_far_away(self):
        # Far from all elements — should return {}
        tags = match_tags_to_segment(35.0, -119.0, self.ELEMENTS)
        assert tags == {}

    def test_empty_elements(self):
        tags = match_tags_to_segment(34.07, -118.44, [])
        assert tags == {}

    def test_element_without_accessibility_tags_ignored(self):
        elements = [{
            "type": "node",
            "lat": 34.07,
            "lon": -118.44,
            "tags": {"name": "Some Bench"},  # no accessibility tags
        }]
        tags = match_tags_to_segment(34.07, -118.44, elements)
        assert tags == {}


# ---------------------------------------------------------------------------
# fetch_accessibility_features (mocked HTTP)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestFetchAccessibilityFeatures:
    BBOX = (34.065, -118.445, 34.073, -118.440)

    @respx.mock
    async def test_happy_path_returns_elements(self):
        respx.post(OVERPASS_URL).mock(
            return_value=httpx.Response(200, json=OVERPASS_RESPONSE)
        )
        elements = await fetch_accessibility_features(self.BBOX)
        assert len(elements) == 2

    @respx.mock
    async def test_non_200_returns_empty_list(self):
        respx.post(OVERPASS_URL).mock(
            return_value=httpx.Response(429, text="rate limited")
        )
        elements = await fetch_accessibility_features(self.BBOX)
        assert elements == []

    @respx.mock
    async def test_network_error_returns_empty_list(self):
        respx.post(OVERPASS_URL).mock(side_effect=httpx.ConnectError("unreachable"))
        elements = await fetch_accessibility_features(self.BBOX)
        assert elements == []
