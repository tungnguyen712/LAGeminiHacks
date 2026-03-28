import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import type { Route } from '../../types/Route';
import { FRICTION_COLORS } from '../../constants/frictionColors';
import { decodePolyline } from '../../utils/polyline';

interface Props {
  routes: Route[];
  onSegmentPress: (segmentId: string) => void;
}

function segmentColor(route: Route, segmentId: string): string {
  const seg = route.segments.find((s) => s.id === segmentId);
  const level = seg?.friction?.level ?? route.overallFriction;
  return FRICTION_COLORS[level];
}

export function RouteMap({ routes, onSegmentPress }: Props) {
  const region = useMemo(() => {
    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    for (const r of routes) {
      for (const s of r.segments) {
        minLat = Math.min(minLat, s.startLat, s.endLat);
        maxLat = Math.max(maxLat, s.startLat, s.endLat);
        minLng = Math.min(minLng, s.startLng, s.endLng);
        maxLng = Math.max(maxLng, s.startLng, s.endLng);
      }
      if (r.polylineEncoded) {
        const pts = decodePolyline(r.polylineEncoded);
        for (const p of pts) {
          minLat = Math.min(minLat, p.latitude);
          maxLat = Math.max(maxLat, p.latitude);
          minLng = Math.min(minLng, p.longitude);
          maxLng = Math.max(maxLng, p.longitude);
        }
      }
    }
    if (minLat > maxLat - 1e-6) {
      return {
        latitude: 34.07,
        longitude: -118.44,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(0.015, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.015, (maxLng - minLng) * 1.4),
    };
  }, [routes]);

  return (
    <View style={styles.wrap}>
      <MapView style={styles.map} initialRegion={region} region={region}>
        {routes.flatMap((route) =>
          route.polylineEncoded
            ? [
                <Polyline
                  key={route.id}
                  coordinates={decodePolyline(route.polylineEncoded)}
                  strokeColor="#8AB4F8"
                  strokeWidth={3}
                />,
              ]
            : route.segments.map((seg) => (
                <Polyline
                  key={seg.id}
                  coordinates={[
                    { latitude: seg.startLat, longitude: seg.startLng },
                    { latitude: seg.endLat, longitude: seg.endLng },
                  ]}
                  strokeColor={segmentColor(route, seg.id)}
                  strokeWidth={5}
                  tappable
                  onPress={() => onSegmentPress(seg.id)}
                />
              ))
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1, minHeight: 280 },
});
