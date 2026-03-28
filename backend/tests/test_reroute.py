"""Integration tests for POST /api/reroute."""
import pytest
import respx
import httpx

from fastapi.testclient import TestClient
from main import app
from services.google_maps import ROUTES_API_URL
from tests.conftest import MAPS_ROUTE_1, MAPS_ROUTE_2

client = TestClient(app)

REROUTE_PAYLOAD = {
    "segmentId": "r0s1",
    "startLat": 34.0681,
    "startLng": -118.4414,
    "endLat": 34.0697,
    "endLng": -118.4421,
    "profile": "wheelchair",
}


@respx.mock
def test_reroute_returns_replacement_segments():
    respx.post(ROUTES_API_URL).mock(
        return_value=httpx.Response(200, json={"routes": [MAPS_ROUTE_1]})
    )
    resp = client.post("/api/reroute", json=REROUTE_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["segmentId"] == "r0s1"
    assert len(body["replacementSegments"]) > 0
    assert body["totalDistanceMeters"] > 0
    assert body["durationSeconds"] > 0


@respx.mock
def test_reroute_segment_ids_prefixed():
    respx.post(ROUTES_API_URL).mock(
        return_value=httpx.Response(200, json={"routes": [MAPS_ROUTE_1]})
    )
    resp = client.post("/api/reroute", json=REROUTE_PAYLOAD)
    assert resp.status_code == 200
    for seg in resp.json()["replacementSegments"]:
        assert seg["id"].startswith("r0s1_detour_s")


@respx.mock
def test_reroute_segments_have_camel_case_coords():
    respx.post(ROUTES_API_URL).mock(
        return_value=httpx.Response(200, json={"routes": [MAPS_ROUTE_1]})
    )
    resp = client.post("/api/reroute", json=REROUTE_PAYLOAD)
    seg = resp.json()["replacementSegments"][0]
    assert "startLat" in seg
    assert "startLng" in seg
    assert "segmentType" in seg
    assert seg["segmentType"] == "walk"


@respx.mock
def test_reroute_404_when_no_routes():
    respx.post(ROUTES_API_URL).mock(
        return_value=httpx.Response(200, json={"routes": []})
    )
    resp = client.post("/api/reroute", json=REROUTE_PAYLOAD)
    assert resp.status_code == 404


@respx.mock
def test_reroute_404_when_all_offset_calls_fail():
    """Both offset calls fail (e.g. 403) → non-fatal → 404 no detour found."""
    respx.post(ROUTES_API_URL).mock(
        return_value=httpx.Response(403, json={"error": "forbidden"})
    )
    resp = client.post("/api/reroute", json=REROUTE_PAYLOAD)
    assert resp.status_code == 404


def test_reroute_422_missing_required_fields():
    resp = client.post("/api/reroute", json={"profile": "wheelchair"})
    assert resp.status_code == 422


@respx.mock
def test_reroute_picks_shorter_detour():
    """When both offsets return routes, the shorter one is used."""
    call_count = 0

    def side_effect(request):
        nonlocal call_count
        call_count += 1
        route = MAPS_ROUTE_1 if call_count == 1 else {**MAPS_ROUTE_2, "duration": "9000s"}
        return httpx.Response(200, json={"routes": [route]})

    respx.post(ROUTES_API_URL).mock(side_effect=side_effect)
    resp = client.post("/api/reroute", json=REROUTE_PAYLOAD)
    assert resp.status_code == 200
    # MAPS_ROUTE_1 = 720s, other = 9000s → should pick ROUTE_1's 3 steps
    assert len(resp.json()["replacementSegments"]) == 3
