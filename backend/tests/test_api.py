"""API smoke + optional live integration (uses keys from backend/.env or ../.env)."""

import base64

import pytest
from starlette.testclient import TestClient

from config import settings
from main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health(client: TestClient) -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_routes_503_without_maps_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    import routers.routes as routes_mod

    monkeypatch.setattr(routes_mod.settings, "google_maps_api_key", "")
    r = client.post(
        "/api/routes",
        json={
            "origin": "UCLA",
            "destination": "Royce Hall",
            "profile": "wheelchair",
        },
    )
    assert r.status_code == 503
    assert "GOOGLE_MAPS_API_KEY" in r.json().get("detail", "")


def test_friction_503_without_gemini_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    import routers.friction as friction_mod

    monkeypatch.setattr(friction_mod.settings, "gemini_api_key", "")
    r = client.post(
        "/api/friction",
        json={
            "segments": [
                {
                    "id": "s1",
                    "description": "Test segment",
                    "distanceMeters": 100,
                }
            ],
            "profile": "wheelchair",
            "languageCode": "en",
        },
    )
    assert r.status_code == 503


def test_tts_503_without_gemini_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    import routers.tts as tts_mod

    monkeypatch.setattr(tts_mod.settings, "gemini_api_key", "")
    r = client.post(
        "/api/tts",
        json={"text": "Hello", "languageTag": "en-US"},
    )
    assert r.status_code == 503


def _skip_if_invalid_google_response(r) -> None:
    if r.status_code == 502 and "API_KEY_INVALID" in r.text:
        pytest.skip("GOOGLE_MAPS_API_KEY rejected by Google — use a valid Routes API key in .env")


@pytest.mark.integration
def test_routes_live_maps(client: TestClient) -> None:
    if not settings.google_maps_api_key.strip():
        pytest.skip("GOOGLE_MAPS_API_KEY not set")
    r = client.post(
        "/api/routes",
        json={
            "origin": "Ackerman Union, UCLA, Los Angeles",
            "destination": "Royce Hall, UCLA, Los Angeles",
            "profile": "wheelchair",
        },
    )
    _skip_if_invalid_google_response(r)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "routes" in body
    assert len(body["routes"]) >= 1
    route0 = body["routes"][0]
    assert "id" in route0 and "segments" in route0
    assert len(route0["segments"]) >= 1
    seg = route0["segments"][0]
    for k in ("id", "description", "startLat", "startLng", "endLat", "endLng", "distanceMeters"):
        assert k in seg, f"missing {k}"


def _skip_if_invalid_gemini_response(r) -> None:
    if r.status_code == 502 and "API_KEY_INVALID" in r.text:
        pytest.skip("GEMINI_API_KEY rejected by Google — use a valid key in .env")


@pytest.mark.integration
def test_friction_live_gemini(client: TestClient) -> None:
    if not settings.gemini_api_key.strip():
        pytest.skip("GEMINI_API_KEY not set")
    r = client.post(
        "/api/friction",
        json={
            "segments": [
                {
                    "id": "int-1",
                    "description": "Wide paved path with curb cuts, no stairs",
                    "distanceMeters": 80,
                }
            ],
            "profile": "wheelchair",
            "languageCode": "en",
        },
    )
    _skip_if_invalid_gemini_response(r)
    assert r.status_code == 200, r.text
    scores = r.json().get("scores", {})
    assert "int-1" in scores
    s = scores["int-1"]
    for k in ("frictionScore", "confidence", "reasons", "recommendation", "level"):
        assert k in s, f"missing {k}"


@pytest.mark.integration
def test_tts_live_gemini(client: TestClient) -> None:
    if not settings.gemini_api_key.strip():
        pytest.skip("GEMINI_API_KEY not set")
    r = client.post(
        "/api/tts",
        json={
            "text": "Route A is safer but about five minutes longer.",
            "languageTag": "en-US",
        },
    )
    _skip_if_invalid_gemini_response(r)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("mimeType") == "audio/wav"
    raw = base64.b64decode(data["audioBase64"])
    assert len(raw) > 1000
    assert raw[:4] == b"RIFF"


def test_live_ws_closes_without_gemini_key(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    import routers.live as live_mod
    from starlette.websockets import WebSocketDisconnect

    monkeypatch.setattr(live_mod.settings, "gemini_api_key", "")
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/api/live?languageCode=en-US") as ws:
            ws.receive_text()
