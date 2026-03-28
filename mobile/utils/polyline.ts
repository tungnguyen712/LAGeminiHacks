/**
 * Decodes a Google-encoded polyline to latitude/longitude coordinates.
 */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    const dlat = decodeValue(encoded, index);
    lat += dlat.value;
    index = dlat.index;
    const dlng = decodeValue(encoded, index);
    lng += dlng.value;
    index = dlng.index;
    coords.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }
  return coords;
}

function decodeValue(encoded: string, index: number): { value: number; index: number } {
  let result = 0;
  let shift = 0;
  let b: number;
  do {
    b = encoded.charCodeAt(index++) - 63;
    result |= (b & 0x1f) << shift;
    shift += 5;
  } while (b >= 0x20);
  const delta = result & 1 ? ~(result >> 1) : result >> 1;
  return { value: delta, index };
}
