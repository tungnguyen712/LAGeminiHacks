"""LA Metro service alerts — elevator / escalator outage cache.

Fetches the LA Metro GTFS-RT service alerts feed (JSON format) and caches
the result for CACHE_TTL_SECONDS so every friction-scoring request in a
5-minute window reuses the same data without hammering the API.

The parsed result is a dict:
  { stop_id: [alert_description, ...] }

If the feed is unavailable or returns unexpected data the function returns {}
(non-fatal — scoring continues without alert context).

LA Metro GTFS-RT feeds are published at:
  https://api.metro.net/gtfs-rt/service_alerts   (protobuf default)
  https://api.metro.net/gtfs-rt/service_alerts?agency=LACMTA_Rail

We request the Protobuf feed but parse it as a fallback text summary;
for the JSON-friendly version we hit the plain-REST alerts endpoint.
"""
import asyncio
import time
import httpx

# LA Metro plain-REST service alerts (JSON, no API key required)
_ALERTS_URL = "https://api.metro.net/gtfs-rt/service_alerts"

CACHE_TTL_SECONDS = 300  # 5 minutes

# Module-level cache: (timestamp, data_dict)
_cache: tuple[float, dict[str, list[str]]] | None = None
_cache_lock = asyncio.Lock()


async def get_service_alerts() -> dict[str, list[str]]:
    """Return cached (or freshly fetched) LA Metro service alerts.

    Returns a dict mapping stop_id (str) → list of alert header strings.
    Returns {} if the feed is unavailable.
    """
    global _cache
    async with _cache_lock:
        now = time.monotonic()
        if _cache is not None and (now - _cache[0]) < CACHE_TTL_SECONDS:
            return _cache[1]

        data = await _fetch_alerts()
        _cache = (now, data)
        return data


async def _fetch_alerts() -> dict[str, list[str]]:
    """Hit the LA Metro GTFS-RT endpoint and parse stop-level alerts."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                _ALERTS_URL,
                headers={"Accept": "application/json"},
            )
        if not resp.is_success:
            return {}
        return _parse_alerts(resp.json())
    except Exception as exc:
        print(f"[la_metro] Alert fetch failed (non-fatal): {exc}")
        return {}


def _parse_alerts(body: object) -> dict[str, list[str]]:
    """Parse GTFS-RT JSON service-alerts body into stop_id → [messages].

    Handles both the wrapped {"alerts": [...]} shape and a bare list.
    Each GTFS-RT entity looks like:
    {
      "id": "...",
      "alert": {
        "informed_entity": [{"stop_id": "..."}],
        "header_text": {"translation": [{"text": "Elevator out of service"}]}
      }
    }
    """
    result: dict[str, list[str]] = {}

    # Normalise to a list of entity objects
    if isinstance(body, dict):
        entities = body.get("entity", body.get("alerts", []))
    elif isinstance(body, list):
        entities = body
    else:
        return result

    for entity in entities:
        alert = entity.get("alert", {})
        if not alert:
            continue

        # Extract header text
        header = ""
        header_text = alert.get("header_text", {})
        translations = header_text.get("translation", [])
        if translations:
            header = translations[0].get("text", "")
        if not header:
            header = alert.get("description_text", {}).get("translation", [{}])[0].get("text", "")

        # Map to each affected stop
        for entity_ref in alert.get("informed_entity", []):
            stop_id = entity_ref.get("stop_id")
            if stop_id and header:
                result.setdefault(stop_id, []).append(header)

    return result


def alerts_for_stop(stop_id: str, alerts: dict[str, list[str]]) -> list[str]:
    """Convenience: return alert messages for a specific stop, or []."""
    return alerts.get(stop_id, [])
