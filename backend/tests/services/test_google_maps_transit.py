"""Unit tests for transit and detour functions in services/google_maps.py."""
import pytest
import respx
import httpx

from services.google_maps import (
    fetch_transit_routes,
    parse_transit_routes,
    fetch_detour_routes,
    parse_detour_segments,
    _perpendicular_offsets,
    _transit_distance_share,
    _build_latlng_payload,
    ROUTES_API_URL,
    MIN_TRANSIT_SHARE,
)
from tests.conftest import (
    TRANSIT_ROUTE_1, TRANSIT_ROUTE_2,
    MAPS_TWO_TRANSIT_RESPONSE, MAPS_ONE_TRANSIT_RESPONSE,
    MAPS_ROUTE_1, MAPS_ROUTE_2,
)


# ---------------------------------------------------------------------------
# parse_transit_routes (pure)
# ---------------------------------------------------------------------------

class TestParseTransitRoutes:
    def test_labels(self):
        parsed = parse_transit_routes([TRANSIT_ROUTE_1, TRANSIT_ROUTE_2])
        assert parsed[0]["label"] == "transit"
        assert parsed[1]["label"] == "transit-alt"

    def test_mode_is_transit(self):
        parsed = parse_transit_routes([TRANSIT_ROUTE_1])
        assert parsed[0]["mode"] == "transit"

    def test_segment_types(self):
        parsed = parse_transit_routes([TRANSIT_ROUTE_1])
        types = [s["segmentType"] for s in parsed[0]["segments"]]
        assert "walk" in types
        assert "transit" in types

    def test_transit_info_populated(self):
        parsed = parse_transit_routes([TRANSIT_ROUTE_1])
        transit_segs = [s for s in parsed[0]["segments"] if s["segmentType"] == "transit"]
        assert len(transit_segs) == 1
        info = transit_segs[0]["transitInfo"]
        assert info["vehicleType"] == "BUS"
        assert info["agencyName"] == "LA Metro"
        assert info["departureStop"] == "Westwood Station"
        assert info["arrivalStop"] == "Union Station"
        assert info["wheelchairAccessible"] is True

    def test_description_uses_route_name(self):
        parsed = parse_transit_routes([TRANSIT_ROUTE_1])
        transit_segs = [s for s in parsed[0]["segments"] if s["segmentType"] == "transit"]
        assert "720" in transit_segs[0]["description"]

    def test_walk_segs_have_no_transit_info(self):
        parsed = parse_transit_routes([TRANSIT_ROUTE_1])
        walk_segs = [s for s in parsed[0]["segments"] if s["segmentType"] == "walk"]
        for s in walk_segs:
            assert s.get("transitInfo") is None

    def test_capped_at_two(self):
        many = [TRANSIT_ROUTE_1] * 5
        parsed = parse_transit_routes(many)
        assert len(parsed) <= 2

    def test_empty_returns_empty(self):
        assert parse_transit_routes([]) == []

    def test_route_index_offset(self):
        """IDs use route_index_offset to avoid colliding with walking route IDs."""
        parsed = parse_transit_routes([TRANSIT_ROUTE_1], route_index_offset=3)
        assert parsed[0]["segments"][0]["id"].startswith("t3s")

    def test_duration_parsed(self):
        parsed = parse_transit_routes([TRANSIT_ROUTE_1])
        assert parsed[0]["durationSeconds"] == 1800


# ---------------------------------------------------------------------------
# fetch_transit_routes (mocked HTTP)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestFetchTransitRoutes:
    @respx.mock
    async def test_returns_up_to_two_routes(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_TWO_TRANSIT_RESPONSE)
        )
        routes = await fetch_transit_routes("A", "B", "key")
        assert len(routes) == 2

    @respx.mock
    async def test_deduplicates_by_transfers_and_duration(self):
        # Both routes are identical → only 1 unique
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json={"routes": [TRANSIT_ROUTE_1, TRANSIT_ROUTE_1]})
        )
        routes = await fetch_transit_routes("A", "B", "key")
        assert len(routes) == 1

    @respx.mock
    async def test_api_error_returns_empty(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(403, json={"error": "forbidden"})
        )
        routes = await fetch_transit_routes("A", "B", "key")
        assert routes == []

    @respx.mock
    async def test_network_error_returns_empty(self):
        respx.post(ROUTES_API_URL).mock(side_effect=httpx.ConnectError("down"))
        routes = await fetch_transit_routes("A", "B", "key")
        assert routes == []

    @respx.mock
    async def test_no_routes_returns_empty(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json={"routes": []})
        )
        routes = await fetch_transit_routes("A", "B", "key")
        assert routes == []

    @respx.mock
    async def test_low_transit_share_filtered_out(self):
        """Route where <25% of distance is on transit should be excluded."""
        # TRANSIT_ROUTE_1 has 7800m bus + 200m walk + 500m walk = 8500m total
        # transit share = 7800/8500 ≈ 91.8% → included
        # Build a mostly-walking route: 100m bus, 900m walk = 10% transit
        mostly_walking = {
            "duration": "1200s",
            "distanceMeters": 1000,
            "polyline": {"encodedPolyline": "xyz"},
            "legs": [{"steps": [
                {"travelMode": "WALK", "distanceMeters": 450,
                 "startLocation": {"latLng": {"latitude": 34.07, "longitude": -118.44}},
                 "endLocation": {"latLng": {"latitude": 34.071, "longitude": -118.441}}},
                {"travelMode": "TRANSIT", "distanceMeters": 100,
                 "startLocation": {"latLng": {"latitude": 34.071, "longitude": -118.441}},
                 "endLocation": {"latLng": {"latitude": 34.072, "longitude": -118.442}},
                 "transitDetails": {
                     "stopDetails": {"departureStop": {"name": "A"}, "arrivalStop": {"name": "B"}},
                     "transitLine": {"name": "X", "vehicle": {"type": "BUS"}, "agencies": [{"name": "Metro"}]},
                 }},
                {"travelMode": "WALK", "distanceMeters": 450,
                 "startLocation": {"latLng": {"latitude": 34.072, "longitude": -118.442}},
                 "endLocation": {"latLng": {"latitude": 34.073, "longitude": -118.443}}},
            ]}],
        }
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json={"routes": [mostly_walking]})
        )
        routes = await fetch_transit_routes("A", "B", "key")
        assert routes == []  # 10% transit share < 25% threshold → filtered


class TestTransitDistanceShare:
    def test_full_transit_route(self):
        # TRANSIT_ROUTE_1: 7800m transit / 8500m total ≈ 91.8%
        share = _transit_distance_share(TRANSIT_ROUTE_1)
        assert share > 0.9

    def test_walking_only_route_has_zero_share(self):
        share = _transit_distance_share(MAPS_ROUTE_1)
        assert share == 0.0

    def test_zero_distance_returns_zero(self):
        raw = {"distanceMeters": 0, "legs": []}
        assert _transit_distance_share(raw) == 0.0


class TestBuildLatlngPayload:
    def test_uses_location_format_not_address(self):
        payload = _build_latlng_payload(34.07, -118.44, 34.08, -118.43)
        assert "location" in payload["origin"]
        assert "address" not in payload["origin"]
        assert payload["origin"]["location"]["latLng"]["latitude"] == 34.07

    def test_intermediate_waypoint_included(self):
        payload = _build_latlng_payload(34.07, -118.44, 34.08, -118.43, (34.075, -118.435))
        assert "intermediates" in payload
        wp = payload["intermediates"][0]["location"]["latLng"]
        assert wp["latitude"] == 34.075

    def test_no_intermediate_by_default(self):
        payload = _build_latlng_payload(34.07, -118.44, 34.08, -118.43)
        assert "intermediates" not in payload


# ---------------------------------------------------------------------------
# Detour helpers (pure)
# ---------------------------------------------------------------------------

class TestPerpendicularOffsets:
    def test_returns_two_points(self):
        offsets = _perpendicular_offsets(34.07, -118.44, 34.08, -118.43)
        assert len(offsets) == 2

    def test_offsets_are_different(self):
        o1, o2 = _perpendicular_offsets(34.07, -118.44, 34.08, -118.43)
        assert o1 != o2

    def test_offsets_are_near_midpoint(self):
        mid_lat, mid_lng = (34.07 + 34.08) / 2, (-118.44 + -118.43) / 2
        for lat, lng in _perpendicular_offsets(34.07, -118.44, 34.08, -118.43):
            assert abs(lat - mid_lat) < 0.01
            assert abs(lng - mid_lng) < 0.01

    def test_zero_length_segment_does_not_crash(self):
        # start == end — degenerate case, should not raise
        result = _perpendicular_offsets(34.07, -118.44, 34.07, -118.44)
        assert len(result) == 2


class TestParseDetourSegments:
    def test_picks_shorter_route(self):
        short = {**MAPS_ROUTE_1, "duration": "300s"}
        long_ = {**MAPS_ROUTE_2, "duration": "900s"}
        segs = parse_detour_segments([long_, short], "seg1")
        # Shorter route (MAPS_ROUTE_1) has 3 steps; longer has 2
        assert len(segs) == 3

    def test_segment_ids_prefixed(self):
        segs = parse_detour_segments([MAPS_ROUTE_1], "r0s2")
        for s in segs:
            assert s["id"].startswith("r0s2_detour_s")

    def test_empty_routes_returns_empty(self):
        assert parse_detour_segments([], "seg1") == []

    def test_segment_type_is_walk(self):
        segs = parse_detour_segments([MAPS_ROUTE_1], "seg1")
        for s in segs:
            assert s["segmentType"] == "walk"


# ---------------------------------------------------------------------------
# fetch_detour_routes (mocked HTTP)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestFetchDetourRoutes:
    @respx.mock
    async def test_returns_routes_from_both_offsets(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json={"routes": [MAPS_ROUTE_1]})
        )
        routes = await fetch_detour_routes(34.07, -118.44, 34.08, -118.43, "key")
        assert len(routes) == 2  # one per offset

    @respx.mock
    async def test_offset_failure_is_non_fatal(self):
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(200, json={"routes": [MAPS_ROUTE_1]})
            return httpx.Response(500, text="error")

        respx.post(ROUTES_API_URL).mock(side_effect=side_effect)
        routes = await fetch_detour_routes(34.07, -118.44, 34.08, -118.43, "key")
        assert len(routes) == 1  # only the successful one

    @respx.mock
    async def test_both_fail_returns_empty(self):
        respx.post(ROUTES_API_URL).mock(return_value=httpx.Response(500, text="error"))
        routes = await fetch_detour_routes(34.07, -118.44, 34.08, -118.43, "key")
        assert routes == []
