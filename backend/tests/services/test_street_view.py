"""Unit tests for services/street_view.py."""
import pytest
import respx
import httpx

from services.street_view import fetch_street_view_image, METADATA_URL, IMAGE_URL

LAT, LNG = 34.0681, -118.4414
FAKE_KEY = "fake-sv-key"
FAKE_JPEG = b"\xff\xd8\xff\xe0fake-image-bytes"


@pytest.mark.asyncio
class TestFetchStreetViewImage:
    @respx.mock
    async def test_returns_bytes_when_panorama_available(self):
        respx.get(METADATA_URL).mock(
            return_value=httpx.Response(200, json={"status": "OK", "pano_id": "abc"})
        )
        respx.get(IMAGE_URL).mock(
            return_value=httpx.Response(200, content=FAKE_JPEG)
        )
        result = await fetch_street_view_image(LAT, LNG, FAKE_KEY)
        assert result == FAKE_JPEG

    @respx.mock
    async def test_returns_none_when_no_panorama(self):
        respx.get(METADATA_URL).mock(
            return_value=httpx.Response(200, json={"status": "ZERO_RESULTS"})
        )
        result = await fetch_street_view_image(LAT, LNG, FAKE_KEY)
        assert result is None

    @respx.mock
    async def test_returns_none_when_metadata_request_fails(self):
        respx.get(METADATA_URL).mock(
            return_value=httpx.Response(500, text="server error")
        )
        result = await fetch_street_view_image(LAT, LNG, FAKE_KEY)
        assert result is None

    @respx.mock
    async def test_returns_none_when_image_download_fails(self):
        respx.get(METADATA_URL).mock(
            return_value=httpx.Response(200, json={"status": "OK"})
        )
        respx.get(IMAGE_URL).mock(
            return_value=httpx.Response(403, text="forbidden")
        )
        result = await fetch_street_view_image(LAT, LNG, FAKE_KEY)
        assert result is None
