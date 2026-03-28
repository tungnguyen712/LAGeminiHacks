"""Unit tests for services/google_maps.py."""
import json
import pytest
import respx
import httpx

from services.google_maps import fetch_walking_routes, parse_routes, ROUTES_API_URL
from tests.conftest import MAPS_TWO_ROUTES_RESPONSE, MAPS_ONE_ROUTE_RESPONSE, MAPS_ROUTE_1, MAPS_ROUTE_2


# ---------------------------------------------------------------------------
# parse_routes (pure function — no HTTP)
# ---------------------------------------------------------------------------

class TestParseRoutes:
    def test_two_routes_labels(self):
        parsed = parse_routes(MAPS_TWO_ROUTES_RESPONSE["routes"])
        assert len(parsed) == 2
        assert parsed[0]["label"] == "fastest"
        assert parsed[1]["label"] == "low-friction"

    def test_one_route_still_labelled_fastest(self):
        parsed = parse_routes(MAPS_ONE_ROUTE_RESPONSE["routes"])
        assert parsed[0]["label"] == "fastest"

    def test_segments_have_coordinates(self):
        parsed = parse_routes(MAPS_TWO_ROUTES_RESPONSE["routes"])
        seg = parsed[0]["segments"][0]
        assert seg["startLat"] == pytest.approx(34.0706)
        assert seg["startLng"] == pytest.approx(-118.4434)
        assert seg["endLat"] == pytest.approx(34.0681)
        assert seg["endLng"] == pytest.approx(-118.4414)

    def test_segment_ids_are_unique(self):
        parsed = parse_routes(MAPS_TWO_ROUTES_RESPONSE["routes"])
        all_ids = [s["id"] for r in parsed for s in r["segments"]]
        assert len(all_ids) == len(set(all_ids))

    def test_duration_parsed_from_string(self):
        parsed = parse_routes(MAPS_TWO_ROUTES_RESPONSE["routes"])
        assert parsed[0]["durationSeconds"] == 720
        assert parsed[1]["durationSeconds"] == 960

    def test_at_most_three_routes(self):
        # Even if Maps returns more, we cap at 3
        many = MAPS_TWO_ROUTES_RESPONSE["routes"] * 5
        parsed = parse_routes(many)
        assert len(parsed) <= 3

    def test_empty_routes(self):
        parsed = parse_routes([])
        assert parsed == []

    def test_step_without_instruction_gets_fallback_description(self):
        raw = [{
            "duration": "60s",
            "distanceMeters": 100,
            "polyline": {"encodedPolyline": ""},
            "legs": [{"steps": [{
                "distanceMeters": 100,
                "startLocation": {"latLng": {"latitude": 0.0, "longitude": 0.0}},
                "endLocation": {"latLng": {"latitude": 0.1, "longitude": 0.1}},
                # no navigationInstruction key
            }]}],
        }]
        parsed = parse_routes(raw)
        assert parsed[0]["segments"][0]["description"] != ""


# ---------------------------------------------------------------------------
# fetch_walking_routes (mocked HTTP)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestFetchWalkingRoutes:
    @respx.mock
    async def test_three_routes_from_primary_no_extra_calls(self):
        """If primary returns 3 routes, no waypoint calls are made."""
        three = {"routes": MAPS_TWO_ROUTES_RESPONSE["routes"] + [MAPS_ROUTE_1]}
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=three)
        )
        routes = await fetch_walking_routes("A", "B", "key")
        assert len(routes) == 3

    @respx.mock
    async def test_pads_to_three_when_primary_returns_one(self):
        """One primary route → two offset-waypoint requests → up to 3 total."""
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(200, json=MAPS_ONE_ROUTE_RESPONSE)
            # Use very different durations (2×–3× the primary) to stay clear of
            # the 10 % duplicate-detection threshold.
            offset_route = {**MAPS_ROUTE_2, "duration": f"{1800 + call_count * 600}s"}
            return httpx.Response(200, json={"routes": [offset_route]})

        respx.post(ROUTES_API_URL).mock(side_effect=side_effect)
        routes = await fetch_walking_routes("A", "B", "key")
        assert len(routes) == 3
        assert call_count == 3  # primary + 2 offset calls

    @respx.mock
    async def test_duplicate_offset_routes_not_added(self):
        """Offset routes with same duration as primary are treated as duplicates."""
        # All requests return the same duration → only 1 unique route
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_ONE_ROUTE_RESPONSE)
        )
        routes = await fetch_walking_routes("A", "B", "key")
        assert len(routes) == 1  # duplicate offset routes rejected

    @respx.mock
    async def test_offset_request_failure_is_non_fatal(self):
        """If waypoint requests fail, the primary route is still returned."""
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(200, json=MAPS_ONE_ROUTE_RESPONSE)
            return httpx.Response(500, text="error")

        respx.post(ROUTES_API_URL).mock(side_effect=side_effect)
        routes = await fetch_walking_routes("A", "B", "key")
        assert len(routes) == 1  # still returns the 1 working route

    @respx.mock
    async def test_api_error_on_primary_raises(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(403, json={"error": "forbidden"})
        )
        with pytest.raises(httpx.HTTPStatusError):
            await fetch_walking_routes("A", "B", "bad-key")

    @respx.mock
    async def test_no_routes_returns_empty_list(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json={"routes": []})
        )
        routes = await fetch_walking_routes("A", "B", "key")
        assert routes == []

    @respx.mock
    async def test_two_primary_routes_makes_one_offset_call(self):
        """2 primary routes → only 1 extra offset call needed to reach 3."""
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(200, json=MAPS_TWO_ROUTES_RESPONSE)
            # Duration far from primary routes (720s, 960s) to avoid duplicate detection
            offset_route = {**MAPS_ROUTE_1, "duration": "2400s"}
            return httpx.Response(200, json={"routes": [offset_route]})

        respx.post(ROUTES_API_URL).mock(side_effect=side_effect)
        routes = await fetch_walking_routes("A", "B", "key")
        assert len(routes) == 3
        assert call_count == 2  # primary + 1 offset
