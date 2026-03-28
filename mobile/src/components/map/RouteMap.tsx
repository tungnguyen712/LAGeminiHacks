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
  userPosition?: { lat: number; lng: number } | null;
  userHeading?: number | null;
  centerOnUser?: boolean;
  /** Padding (px) reserved for the bottom sheet when fitting route bounds */
  fitPaddingBottom?: number;
}

export const RouteMap = ({
  origin,
  destination,
  height,        // undefined = fill parent via containerFull (flex:1)
  isDark = true,
  segments,
  onSegmentClick,
  userPosition,
  userHeading = null,
  centerOnUser = false,
  fitPaddingBottom = 60,
}: RouteMapProps) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const polylineRefs = useRef<google.maps.Polyline[]>([]);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const gpsDotRef = useRef<google.maps.Marker | null>(null);
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
      suppressPolylines: true,
      suppressMarkers: true,
      preserveViewport: true, // we call fitBounds manually with sheet padding
    });
    rendererRef.current.setMap(mapRef.current);
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

          // Fit the route in the visible area above the bottom sheet
          const bounds = result.routes[0]?.bounds;
          if (bounds && mapRef.current) {
            mapRef.current.fitBounds(bounds, {
              top: 60, right: 20, bottom: fitPaddingBottom, left: 20,
            });
          }

          // Origin / destination markers
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

  // Draw per-segment friction polylines
  useEffect(() => {
    if (!mapRef.current) return;

    polylineRefs.current.forEach(p => p.setMap(null));
    polylineRefs.current = [];

    if (!segments?.length) return;

    segments.forEach((seg) => {
      if (seg.startLat == null || seg.startLng == null || seg.endLat == null || seg.endLng == null) return;

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

      // Click → notify parent only (no InfoWindow — parent shows its own callout)
      polyline.addListener('click', () => onSegmentClick?.(seg));

      polylineRefs.current.push(polyline);
    });
  }, [segments, onSegmentClick]);

  // GPS arrow — update position and rotation when userPosition/heading changes
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;
    const pos = { lat: userPosition.lat, lng: userPosition.lng };

    const icon: google.maps.Symbol = {
      // Forward-pointing arrow
      path: 'M 0,-1 L 0.6,0.8 L 0,0.4 L -0.6,0.8 Z',
      fillColor: '#3b82f6',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 0.4,
      scale: 18,
      rotation: userHeading ?? 0,
      anchor: new window.google.maps.Point(0, 0),
    };

    if (gpsDotRef.current) {
      gpsDotRef.current.setPosition(pos);
      gpsDotRef.current.setIcon(icon);
    } else {
      gpsDotRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon,
        title: 'Your location',
        zIndex: 100,
      });
    }

    if (centerOnUser) {
      mapRef.current.panTo(pos);
    }
  }, [userPosition, userHeading, centerOnUser]);

  return (
    <View style={height !== undefined ? [styles.container, { height }] : styles.containerFull}>
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
  containerFull: { flex: 1, overflow: 'hidden', position: 'relative' } as any,
  errorOverlay: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  } as any,
  errorText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});
