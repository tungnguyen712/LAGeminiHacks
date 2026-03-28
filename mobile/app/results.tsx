import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { RouteMap } from '../components/map/RouteMap';
import { RouteCard } from '../components/route/RouteCard';
import { ProfileBadge } from '../components/profile/ProfileBadge';
import { useRouteContext } from '../store/RouteContext';
import { useProfileContext } from '../store/ProfileContext';

export default function ResultsScreen() {
  const { routes, setSelectedRoute, setSelectedSegment } = useRouteContext();
  const { profile } = useProfileContext();

  if (!profile) {
    router.replace('/');
    return null;
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Routes</Text>
        <ProfileBadge profile={profile} />
      </View>
      <View style={styles.mapBox}>
        <RouteMap
          routes={routes}
          onSegmentPress={(segmentId) => {
            for (const r of routes) {
              const seg = r.segments.find((s) => s.id === segmentId);
              if (seg) {
                setSelectedRoute(r);
                setSelectedSegment(seg);
                router.push({ pathname: '/segment', params: { segmentId } });
                return;
              }
            }
          }}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            onSelect={(id) => {
              const r = routes.find((x) => x.id === id);
              if (r) setSelectedRoute(r);
              router.push('/navigate');
            }}
            onSegmentPress={(segmentId) => {
              const seg = route.segments.find((s) => s.id === segmentId);
              if (seg) {
                setSelectedRoute(route);
                setSelectedSegment(seg);
                router.push({ pathname: '/segment', params: { segmentId } });
              }
            }}
          />
        ))}
        {routes.length === 0 && (
          <Text style={styles.empty}>No routes loaded. Go back and search again.</Text>
        )}
      </ScrollView>
      <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/navigate')}>
        <Text style={styles.navBtnText}>Start navigation</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#1C1C1E' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: { color: '#F2F2F7', fontSize: 20, fontWeight: '700' },
  mapBox: { height: 280, marginHorizontal: 16 },
  scroll: { padding: 16, paddingBottom: 100 },
  empty: { color: '#8E8E93', textAlign: 'center', marginTop: 24 },
  navBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#8AB4F8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  navBtnText: { color: '#1C1C1E', fontSize: 16, fontWeight: '800' },
});
