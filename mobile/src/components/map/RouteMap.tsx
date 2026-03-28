import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { RouteSegment } from '../../types/Route';

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e40af' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c4a6e' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#162032' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111827' }] },
];

const FRICTION_STROKE: Record<string, { color: string; weight: number; zIndex: number }> = {
  low:    { color: '#10b981', weight: 5, zIndex: 1 },
  medium: { color: '#f59e0b', weight: 5, zIndex: 2 },
  high:   { color: '#ef4444', weight: 6, zIndex: 3 },
};

interface RouteMapProps {
  origin: string;
  destination: string;
  frictionColor?: string;
  height?: number;
  isDark?: boolean;
  segments?: RouteSegment[];
  onSegmentClick?: (seg: RouteSegment) => void;
}

export const RouteMap = ({
  origin,
  destination,
  frictionColor,
  height = 260,
  isDark = true,
  segments,
  onSegmentClick,
}: RouteMapProps) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const polylineRefs = useRef<google.maps.Polyline[]>([]);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialise map once
  useEffect(() => {
    if (!mapDivRef.current || !window.google?.maps) return;
    if (mapRef.current) {
      mapRef.current.setOptions({ styles: isDark ? DARK_MAP_STYLES : [] });
      return;
    }

    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: { lat: 34.0522, lng: -118.2437 },
      zoom: 14,
      styles: isDark ? DARK_MAP_STYLES : [],
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });

    rendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressPolylines: true, // we draw our own per-segment polylines
      suppressMarkers: true,   // we draw our own friendly markers
    });
    rendererRef.current.setMap(mapRef.current);

    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, [isDark]);

  // Fetch directions when origin/destination change
  useEffect(() => {
    if (!mapRef.current || !rendererRef.current) return;
    if (!origin || !destination) return;

    new window.google.maps.DirectionsService().route(
      { origin, destination, travelMode: window.google.maps.TravelMode.WALKING },
      (result, status) => {
        if (status === 'OK' && result) {
          rendererRef.current?.setDirections(result);
          setError(null);

          // Clear old markers
          markerRefs.current.forEach(m => m.setMap(null));
          markerRefs.current = [];

          const leg = result.routes[0]?.legs[0];
          if (leg && mapRef.current) {
            markerRefs.current.push(
              new window.google.maps.Marker({
                position: leg.start_location,
                map: mapRef.current,
                icon: {
                  path: (window.google.maps.SymbolPath as any).CIRCLE,
                  fillColor: '#10b981', fillOpacity: 1,
                  strokeColor: '#ffffff', strokeWeight: 2,
                  scale: 9,
                },
                title: 'Start',
              }),
              new window.google.maps.Marker({
                position: leg.end_location,
                map: mapRef.current,
                icon: {
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  fillColor: '#ef4444', fillOpacity: 1,
                  strokeColor: '#ffffff', strokeWeight: 1,
                  scale: 1.6,
                  anchor: new window.google.maps.Point(12, 22),
                },
                title: 'Destination',
              })
            );
          }
        } else {
          setError('Route not found — check origin & destination');
        }
      }
    );
  }, [origin, destination]);

  // Draw per-segment friction polylines whenever segments change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear previous polylines
    polylineRefs.current.forEach(p => p.setMap(null));
    polylineRefs.current = [];

    if (!segments?.length) return;

    segments.forEach((seg) => {
      if (
        seg.startLat == null || seg.startLng == null ||
        seg.endLat == null   || seg.endLng == null
      ) return;

      const style = FRICTION_STROKE[seg.friction] ?? FRICTION_STROKE.low;

      const polyline = new window.google.maps.Polyline({
        path: [
          { lat: seg.startLat, lng: seg.startLng },
          { lat: seg.endLat,   lng: seg.endLng   },
        ],
        strokeColor:   style.color,
        strokeWeight:  style.weight,
        strokeOpacity: 0.9,
        zIndex:        style.zIndex,
        map:           mapRef.current!,
      });

      polyline.addListener('click', (e: google.maps.MapMouseEvent) => {
        onSegmentClick?.(seg);

        // Show InfoWindow on the map at click position
        if (infoWindowRef.current && e.latLng) {
          const frictionLabel = seg.friction.toUpperCase();
          const detailsHtml = seg.details
            ? `<div style="margin-top:4px;font-size:12px;color:#64748b;font-style:italic">${seg.details}</div>`
            : '';
          infoWindowRef.current.setContent(`
            <div style="max-width:220px;font-family:sans-serif;padding:4px 2px">
              <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px">
                ${seg.instruction}
              </div>
              <span style="
                display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;
                background:${style.color}22;color:${style.color}
              ">${frictionLabel} FRICTION</span>
              <div style="font-size:12px;color:#64748b;margin-top:4px">${seg.distance}</div>
              ${detailsHtml}
            </div>
          `);
          infoWindowRef.current.setPosition(e.latLng);
          infoWindowRef.current.open(mapRef.current!);
        }
      });

      polylineRefs.current.push(polyline);
    });
  }, [segments, onSegmentClick]);

  return (
    <View style={[styles.container, { height }]}>
      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden', position: 'relative' } as any,
  errorOverlay: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  } as any,
  errorText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});
