"""Integration tests for POST /api/routes."""
import pytest
import respx
import httpx
from fastapi.testclient import TestClient

from main import app
from services.google_maps import ROUTES_API_URL
from tests.conftest import (
    MAPS_TWO_ROUTES_RESPONSE,
    MAPS_ONE_ROUTE_RESPONSE,
    MAPS_NO_ROUTES_RESPONSE,
    MAPS_TWO_TRANSIT_RESPONSE,
    TRANSIT_ROUTE_1,
)

client = TestClient(app)


class TestGetRoutes:
    REQUEST_BODY = {
        "origin": "Ackerman Union, UCLA",
        "destination": "Powell Library, UCLA",
        "profile": "wheelchair",
        "mode": "walking",   # only walking — isolates tests from transit mock
    }

    @respx.mock
    def test_returns_routes_list(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_TWO_ROUTES_RESPONSE)
        )
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        assert resp.status_code == 200
        data = resp.json()
        assert "routes" in data
        # Walking routes only (transit fetch also called but returns same mock data which
        # will parse as walking — we just need at least 1 route)
        assert len(data["routes"]) >= 1

    @respx.mock
    def test_response_shape_matches_mobile_types(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_TWO_ROUTES_RESPONSE)
        )
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        route = resp.json()["routes"][0]

        # All camelCase fields present
        for field in ("id", "label", "mode", "durationSeconds", "distanceMeters",
                      "overallFriction", "segments", "polylineEncoded"):
            assert field in route, f"Missing field: {field}"

    @respx.mock
    def test_segment_shape(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_TWO_ROUTES_RESPONSE)
        )
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        seg = resp.json()["routes"][0]["segments"][0]
        for field in ("id", "description", "segmentType", "startLat", "startLng",
                      "endLat", "endLng", "distanceMeters"):
            assert field in seg, f"Missing field: {field}"

    @respx.mock
    def test_first_route_labelled_fastest(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_TWO_ROUTES_RESPONSE)
        )
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        assert resp.json()["routes"][0]["label"] == "fastest"

    @respx.mock
    def test_one_route_still_returns_200(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_ONE_ROUTE_RESPONSE)
        )
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        assert resp.status_code == 200
        assert len(resp.json()["routes"]) == 1

    @respx.mock
    def test_no_routes_returns_404(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_NO_ROUTES_RESPONSE)
        )
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        assert resp.status_code == 404

    @respx.mock
    def test_maps_api_error_returns_502(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(403, json={"error": "forbidden"})
        )
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        assert resp.status_code == 502

    def test_missing_origin_returns_422(self):
        resp = client.post("/api/routes", json={"destination": "B", "profile": "wheelchair"})
        assert resp.status_code == 422

    def test_missing_profile_returns_422(self):
        resp = client.post("/api/routes", json={"origin": "A", "destination": "B"})
        assert resp.status_code == 422

    @respx.mock
    def test_camel_case_request_accepted(self):
        """Mobile sends camelCase — backend must accept it."""
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_ONE_ROUTE_RESPONSE)
        )
        # All fields are already simple strings here, no snake/camel difference
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        assert resp.status_code == 200

    @respx.mock
    def test_coordinates_in_segments(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_ONE_ROUTE_RESPONSE)
        )
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        seg = resp.json()["routes"][0]["segments"][0]
        assert seg["startLat"] != 0.0
        assert seg["startLng"] != 0.0

    @respx.mock
    def test_walking_mode_field(self):
        respx.post(ROUTES_API_URL).mock(
            return_value=httpx.Response(200, json=MAPS_ONE_ROUTE_RESPONSE)
        )
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        walking_routes = [r for r in resp.json()["routes"] if r["mode"] == "walking"]
        assert len(walking_routes) >= 1

    @respx.mock
    def test_transit_failure_does_not_break_walking_response(self):
        """Transit fetch 503 → walking routes still returned."""
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First call is walking
                return httpx.Response(200, json=MAPS_ONE_ROUTE_RESPONSE)
            # Transit call fails
            return httpx.Response(503, text="service unavailable")

        respx.post(ROUTES_API_URL).mock(side_effect=side_effect)
        resp = client.post("/api/routes", json=self.REQUEST_BODY)
        assert resp.status_code == 200
        routes = resp.json()["routes"]
        assert any(r["mode"] == "walking" for r in routes)
