"""Unit tests for services/la_metro.py."""
import pytest
import respx
import httpx

from services.la_metro import (
    get_service_alerts,
    _parse_alerts,
    alerts_for_stop,
    _ALERTS_URL,
    _cache,
)
import services.la_metro as la_metro_module
from tests.conftest import LA_METRO_ALERTS_RESPONSE


class TestParseAlerts:
    def test_parses_stop_alert(self):
        result = _parse_alerts(LA_METRO_ALERTS_RESPONSE)
        assert "Westwood Station" in result
        assert result["Westwood Station"][0] == "Elevator out of service at Westwood Station"

    def test_empty_entity_list(self):
        assert _parse_alerts({"entity": []}) == {}

    def test_missing_stop_id_skipped(self):
        body = {"entity": [{"alert": {
            "informed_entity": [{}],  # no stop_id
            "header_text": {"translation": [{"text": "Alert"}]},
        }}]}
        assert _parse_alerts(body) == {}

    def test_alert_without_header_skipped(self):
        body = {"entity": [{"alert": {
            "informed_entity": [{"stop_id": "S1"}],
            "header_text": {"translation": []},
        }}]}
        assert _parse_alerts(body) == {}

    def test_multiple_stops_per_alert(self):
        body = {"entity": [{"alert": {
            "informed_entity": [{"stop_id": "A"}, {"stop_id": "B"}],
            "header_text": {"translation": [{"text": "Outage"}]},
        }}]}
        result = _parse_alerts(body)
        assert "A" in result and "B" in result

    def test_bare_list_body(self):
        """Body can be a bare list of entities."""
        entities = LA_METRO_ALERTS_RESPONSE["entity"]
        result = _parse_alerts(entities)
        assert "Westwood Station" in result

    def test_unknown_body_returns_empty(self):
        assert _parse_alerts("not a dict or list") == {}  # type: ignore[arg-type]


class TestAlertsForStop:
    def test_returns_messages_for_known_stop(self):
        alerts = {"S1": ["Elevator down"]}
        assert alerts_for_stop("S1", alerts) == ["Elevator down"]

    def test_returns_empty_for_unknown_stop(self):
        assert alerts_for_stop("UNKNOWN", {}) == []


@pytest.fixture(autouse=True)
def _reset_la_metro_cache():
    """Reset the module-level alert cache before every test in this file."""
    la_metro_module._cache = None
    yield
    la_metro_module._cache = None


@pytest.mark.asyncio
class TestGetServiceAlerts:
    @respx.mock
    async def test_fetches_and_returns_alerts(self):
        respx.get(_ALERTS_URL).mock(
            return_value=httpx.Response(200, json=LA_METRO_ALERTS_RESPONSE)
        )
        result = await get_service_alerts()
        assert "Westwood Station" in result

    @respx.mock
    async def test_server_error_returns_empty(self):
        respx.get(_ALERTS_URL).mock(return_value=httpx.Response(500, text="error"))
        result = await get_service_alerts()
        assert result == {}

    @respx.mock
    async def test_network_error_returns_empty(self):
        respx.get(_ALERTS_URL).mock(side_effect=httpx.ConnectError("unreachable"))
        result = await get_service_alerts()
        assert result == {}

    @respx.mock
    async def test_cache_prevents_second_request(self):
        call_count = 0

        def handler(request):
            nonlocal call_count
            call_count += 1
            return httpx.Response(200, json=LA_METRO_ALERTS_RESPONSE)

        respx.get(_ALERTS_URL).mock(side_effect=handler)
        await get_service_alerts()
        await get_service_alerts()  # second call — should use cache
        assert call_count == 1
