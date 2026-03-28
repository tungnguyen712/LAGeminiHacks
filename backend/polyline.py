"""Decode Google encoded polylines to (lat, lng) tuples."""


def decode(encoded: str) -> list[tuple[float, float]]:
    index = 0
    lat = 0
    lng = 0
    coords: list[tuple[float, float]] = []
    while index < len(encoded):
        lat_change, index = _decode_value(encoded, index)
        lng_change, index = _decode_value(encoded, index)
        lat += lat_change
        lng += lng_change
        coords.append((lat * 1e-5, lng * 1e-5))
    return coords


def _decode_value(encoded: str, index: int) -> tuple[int, int]:
    result = 0
    shift = 0
    while True:
        b = ord(encoded[index]) - 63
        index += 1
        result |= (b & 0x1F) << shift
        shift += 5
        if b < 0x20:
            break
    delta = ~(result >> 1) if (result & 1) else (result >> 1)
    return delta, index
