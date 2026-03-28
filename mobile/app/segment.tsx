import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SegmentPanel } from '../components/route/SegmentPanel';
import { VoiceSheet } from '../components/voice/VoiceSheet';
import { useLiveAPI } from '../hooks/useLiveAPI';
import { useRouteContext } from '../store/RouteContext';
import { useLocaleContext } from '../store/LocaleContext';

export default function SegmentScreen() {
  const { segmentId } = useLocalSearchParams<{ segmentId: string }>();
  const { routes, selectedRoute, selectedSegment } = useRouteContext();
  const { languageCode } = useLocaleContext();

  const segment = useMemo(() => {
    if (selectedSegment?.id === segmentId) return selectedSegment;
    for (const r of routes) {
      const s = r.segments.find((x) => x.id === segmentId);
      if (s) return s;
    }
    return null;
  }, [routes, selectedSegment, segmentId]);

  const routeContext = useMemo(() => {
    const r = selectedRoute ?? routes[0];
    if (!r || !segment) return '';
    return [
      `Route: ${r.label}, ${r.distanceMeters}m, ~${Math.round(r.durationSeconds / 60)} min`,
      `Segment: ${segment.description} (${segment.distanceMeters}m)`,
      segment.friction
        ? `Friction: ${segment.friction.level}, score ${segment.friction.frictionScore}`
        : '',
    ].join('\n');
  }, [routes, selectedRoute, segment]);

  const live = useLiveAPI(routeContext, languageCode);

  if (!segment) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Segment not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SegmentPanel segment={segment} />
      <View style={styles.voice}>
        <VoiceSheet
          transcript={live.transcript}
          connected={live.connected}
          onConnect={live.connect}
          onDisconnect={live.disconnect}
          onAudio={live.sendAudio}
        />
      </View>
      <Text style={styles.note}>
        Tip: ask “Why is this segment red?” — TTS summaries use the Play button on Navigate.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1C1E', paddingTop: 8 },
  voice: { paddingHorizontal: 16, marginTop: 8 },
  note: { color: '#636366', fontSize: 12, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1C1C1E' },
  muted: { color: '#8E8E93' },
});
