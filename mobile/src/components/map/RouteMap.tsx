import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { FRICTION_COLORS } from '../../constants/frictionColors';

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

interface RouteMapProps {
  origin: string;
  destination: string;
  frictionColor?: string;
  height?: number;
}

export const RouteMap = ({ origin, destination, frictionColor, height = 260 }: RouteMapProps) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Init map + fetch directions together so there's no race condition
  useEffect(() => {
    if (!mapDivRef.current) return;
    if (!window.google?.maps) return;

    // Init map if not yet done
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapDivRef.current, {
        center: { lat: 34.0522, lng: -118.2437 },
        zoom: 14,
        styles: DARK_MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });
      rendererRef.current = new window.google.maps.DirectionsRenderer();
      rendererRef.current.setMap(mapRef.current);
    }

    if (!origin || !destination) return;

    const color = frictionColor || FRICTION_COLORS.low;
    rendererRef.current?.setOptions({
      polylineOptions: { strokeColor: color, strokeWeight: 5, strokeOpacity: 0.9 },
    });

    new window.google.maps.DirectionsService().route(
      { origin, destination, travelMode: window.google.maps.TravelMode.WALKING },
      (result, status) => {
        if (status === 'OK' && result) {
          rendererRef.current?.setDirections(result);
          setError(null);
        } else {
          setError('Route not found — check origin & destination');
        }
      }
    );
  }, [origin, destination, frictionColor]);

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
  container: {
    overflow: 'hidden',
    position: 'relative',
  } as any,
  errorOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  } as any,
  errorText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
