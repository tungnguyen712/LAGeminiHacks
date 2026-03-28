import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { VoiceSheet } from '../components/voice/VoiceSheet';
import { TTSAlert } from '../components/voice/TTSAlert';
import { useLiveAPI } from '../hooks/useLiveAPI';
import { useRouteContext } from '../store/RouteContext';
import { useLocaleContext } from '../store/LocaleContext';
import { ProfileBadge } from '../components/profile/ProfileBadge';
import { useProfileContext } from '../store/ProfileContext';

export default function NavigateScreen() {
  const { routes, selectedRoute } = useRouteContext();
  const { profile } = useProfileContext();
  const { languageCode, languageTag } = useLocaleContext();

  const route = selectedRoute ?? routes[0];

  const routeContext = useMemo(() => {
    if (!routes.length) return '';
    return routes
      .map(
        (r) =>
          `${r.label}: ${Math.round(r.distanceMeters)} m, ~${Math.round(r.durationSeconds / 60)} min, overall ${r.overallFriction}`
      )
      .join('\n');
  }, [routes]);

  const summary = useMemo(() => {
    if (!route) return '';
    return `Selected route ${route.label}: about ${Math.round(route.durationSeconds / 60)} minutes and ${Math.round(route.distanceMeters)} meters. Overall friction ${route.overallFriction}.`;
  }, [route]);

  const live = useLiveAPI(routeContext, languageCode);

  if (!profile || !route) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Select a route from results first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Navigate</Text>
        <ProfileBadge profile={profile} />
      </View>
      <Text style={styles.body}>{summary}</Text>
      <TTSAlert message={summary} languageTag={languageTag} />
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
        Hands-free: connect Gemini Live and ask “Which route is safest for me?” Spoken replies help low-vision and
        hands-free use.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#1C1C1E' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { color: '#F2F2F7', fontSize: 22, fontWeight: '700' },
  body: { color: '#E5E5EA', fontSize: 16, lineHeight: 24, marginBottom: 12 },
  voice: { marginTop: 8 },
  note: { color: '#636366', fontSize: 12, marginTop: 16, lineHeight: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1C1C1E' },
  muted: { color: '#8E8E93', fontSize: 16 },
});
