"""Shared fixtures for all tests."""
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """Synchronous FastAPI test client (no real HTTP)."""
    return TestClient(app)


# ---------------------------------------------------------------------------
# Canned Google Maps Routes API response (UCLA: Ackerman → Powell Library)
# ---------------------------------------------------------------------------

MAPS_ROUTE_1 = {
    "duration": "720s",
    "distanceMeters": 950,
    "polyline": {"encodedPolyline": "abc123"},
    "legs": [{
        "steps": [
            {
                "navigationInstruction": {"instructions": "Head north on Bruin Walk"},
                "distanceMeters": 320,
                "startLocation": {"latLng": {"latitude": 34.0706, "longitude": -118.4434}},
                "endLocation": {"latLng": {"latitude": 34.0681, "longitude": -118.4414}},
            },
            {
                "navigationInstruction": {"instructions": "Turn right up steps to Powell Library"},
                "distanceMeters": 230,
                "startLocation": {"latLng": {"latitude": 34.0681, "longitude": -118.4414}},
                "endLocation": {"latLng": {"latitude": 34.0697, "longitude": -118.4421}},
            },
            {
                "navigationInstruction": {"instructions": "Continue on Charles E. Young Drive"},
                "distanceMeters": 400,
                "startLocation": {"latLng": {"latitude": 34.0697, "longitude": -118.4421}},
                "endLocation": {"latLng": {"latitude": 34.0712, "longitude": -118.4435}},
            },
        ]
    }],
}

MAPS_ROUTE_2 = {
    "duration": "960s",
    "distanceMeters": 1200,
    "polyline": {"encodedPolyline": "def456"},
    "legs": [{
        "steps": [
            {
                "navigationInstruction": {"instructions": "Head south via accessible ramp"},
                "distanceMeters": 400,
                "startLocation": {"latLng": {"latitude": 34.0706, "longitude": -118.4434}},
                "endLocation": {"latLng": {"latitude": 34.0695, "longitude": -118.4430}},
            },
            {
                "navigationInstruction": {"instructions": "Continue on Campus Drive"},
                "distanceMeters": 800,
                "startLocation": {"latLng": {"latitude": 34.0695, "longitude": -118.4430}},
                "endLocation": {"latLng": {"latitude": 34.0712, "longitude": -118.4450}},
            },
        ]
    }],
}

MAPS_TWO_ROUTES_RESPONSE = {"routes": [MAPS_ROUTE_1, MAPS_ROUTE_2]}
MAPS_ONE_ROUTE_RESPONSE = {"routes": [MAPS_ROUTE_1]}
MAPS_NO_ROUTES_RESPONSE = {"routes": []}

# ---------------------------------------------------------------------------
# Canned Google Maps TRANSIT response
# ---------------------------------------------------------------------------

TRANSIT_ROUTE_1 = {
    "duration": "1800s",
    "distanceMeters": 8500,
    "polyline": {"encodedPolyline": "transit_abc"},
    "legs": [{
        "steps": [
            {
                "travelMode": "WALK",
                "navigationInstruction": {"instructions": "Walk to Westwood Station"},
                "distanceMeters": 200,
                "startLocation": {"latLng": {"latitude": 34.0706, "longitude": -118.4434}},
                "endLocation": {"latLng": {"latitude": 34.0700, "longitude": -118.4440}},
            },
            {
                "travelMode": "TRANSIT",
                "navigationInstruction": {"instructions": "Take Metro Bus 720"},
                "distanceMeters": 7800,
                "startLocation": {"latLng": {"latitude": 34.0700, "longitude": -118.4440}},
                "endLocation": {"latLng": {"latitude": 34.0550, "longitude": -118.2500}},
                "transitDetails": {
                    "stopDetails": {
                        "departureStop": {"name": "Westwood Station"},
                        "arrivalStop": {"name": "Union Station"},
                    },
                    "transitLine": {
                        "name": "Metro Bus 720",
                        "nameShort": "720",
                        "vehicle": {"type": "BUS"},
                        "agencies": [{"name": "LA Metro"}],
                        "wheelchairAccessible": True,
                    },
                },
            },
            {
                "travelMode": "WALK",
                "navigationInstruction": {"instructions": "Walk to destination"},
                "distanceMeters": 500,
                "startLocation": {"latLng": {"latitude": 34.0550, "longitude": -118.2500}},
                "endLocation": {"latLng": {"latitude": 34.0560, "longitude": -118.2480}},
            },
        ]
    }],
}

TRANSIT_ROUTE_2 = {
    "duration": "2400s",
    "distanceMeters": 9200,
    "polyline": {"encodedPolyline": "transit_def"},
    "legs": [{
        "steps": [
            {
                "travelMode": "TRANSIT",
                "navigationInstruction": {"instructions": "Take Metro Rail B Line"},
                "distanceMeters": 9200,
                "startLocation": {"latLng": {"latitude": 34.0706, "longitude": -118.4434}},
                "endLocation": {"latLng": {"latitude": 34.0550, "longitude": -118.2500}},
                "transitDetails": {
                    "stopDetails": {
                        "departureStop": {"name": "UCLA Station"},
                        "arrivalStop": {"name": "Union Station"},
                    },
                    "transitLine": {
                        "name": "B Line",
                        "nameShort": "B",
                        "vehicle": {"type": "SUBWAY"},
                        "agencies": [{"name": "LA Metro"}],
                        "wheelchairAccessible": True,
                    },
                },
            },
        ]
    }],
}

MAPS_TWO_TRANSIT_RESPONSE = {"routes": [TRANSIT_ROUTE_1, TRANSIT_ROUTE_2]}
MAPS_ONE_TRANSIT_RESPONSE = {"routes": [TRANSIT_ROUTE_1]}

# ---------------------------------------------------------------------------
# Canned LA Metro alerts response
# ---------------------------------------------------------------------------

LA_METRO_ALERTS_RESPONSE = {
    "entity": [
        {
            "id": "alert-1",
            "alert": {
                "informed_entity": [{"stop_id": "Westwood Station"}],
                "header_text": {
                    "translation": [{"text": "Elevator out of service at Westwood Station"}]
                },
            },
        }
    ]
}


# ---------------------------------------------------------------------------
# Canned Overpass response
# ---------------------------------------------------------------------------

OVERPASS_RESPONSE = {
    "elements": [
        {
            "type": "way",
            "lat": 34.06815,
            "lon": -118.4415,
            "center": {"lat": 34.06815, "lon": -118.4415},
            "tags": {
                "highway": "steps",
                "step_count": "12",
                "handrail": "yes",
                "tactile_paving": "no",
            },
        },
        {
            "type": "node",
            "lat": 34.07065,
            "lon": -118.44335,
            "tags": {
                "kerb": "lowered",
                "tactile_paving": "yes",
            },
        },
    ]
}


# ---------------------------------------------------------------------------
# Canned Gemini batch-scoring response
# ---------------------------------------------------------------------------

def make_gemini_batch_response(items: list[dict]) -> dict:
    """Wrap items in the Gemini generateContent response envelope."""
    import json
    return {
        "candidates": [{
            "content": {
                "parts": [{"text": json.dumps(items)}]
            }
        }]
    }


GEMINI_BATCH_LOW = make_gemini_batch_response([
    {"id": "r0s0", "frictionScore": 0.2, "confidence": 0.9,
     "reasons": ["Wide paved path"], "recommendation": "Good for wheelchairs"},
])

GEMINI_BATCH_HIGH = make_gemini_batch_response([
    {"id": "r0s1", "frictionScore": 0.85, "confidence": 0.95,
     "reasons": ["12 stairs, no ramp"], "recommendation": "Use accessible detour"},
])

GEMINI_VISION_RESPONSE = make_gemini_batch_response(
    {"id": "r0s1", "frictionScore": 0.88, "confidence": 0.97,
     "reasons": ["Image shows 12 stone steps, no visible ramp"],
     "recommendation": "Avoid — use the ramp on Westwood Plaza"}
)
# Vision returns a single dict, not a list — override:
GEMINI_VISION_RESPONSE["candidates"][0]["content"]["parts"][0]["text"] = (
    '{"id":"r0s1","frictionScore":0.88,"confidence":0.97,'
    '"reasons":["Image shows 12 stone steps, no visible ramp"],'
    '"recommendation":"Avoid — use the ramp on Westwood Plaza"}'
)
