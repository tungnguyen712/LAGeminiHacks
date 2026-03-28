import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useProfile } from '../store/ProfileContext';
import { useLanguage, THEME_MODES } from '../store/LanguageContext';
import { RouteMap } from '../components/map/RouteMap';
import { RouteCard } from '../components/route/RouteCard';
import { ProfileBadge } from '../components/profile/ProfileBadge';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Route } from '../types/Route';

const MOCK_ROUTES: Route[] = [
  {
    id: '1',
    name: 'Accessible Path',
    totalDistance: '1.2 km',
    estimatedTime: '15 min',
    overallFriction: 'low',
    confidence: 0.94,
    segments: [
      { id: 's1', instruction: 'Head north on Main St', distance: '400m', friction: 'low', confidence: 0.98, type: 'sidewalk' },
      { id: 's2', instruction: 'Turn right onto Park Ave', distance: '800m', friction: 'medium', confidence: 0.88, type: 'sidewalk', details: 'Slight incline (4%)' },
    ],
  },
  {
    id: '2',
    name: 'Direct Route',
    totalDistance: '0.9 km',
    estimatedTime: '12 min',
    overallFriction: 'high',
    confidence: 0.72,
    segments: [
      { id: 's3', instruction: 'Head north on Main St', distance: '300m', friction: 'low', confidence: 0.95, type: 'sidewalk' },
      { id: 's4', instruction: 'Cross Broadway', distance: '50m', friction: 'high', confidence: 0.65, type: 'crossing', details: 'No curb cut on west side' },
      { id: 's5', instruction: 'Continue on 2nd St', distance: '550m', friction: 'medium', confidence: 0.82, type: 'sidewalk' },
    ],
  },
];

export const ResultsScreen = () => {
  const { activeRoute, setActiveRoute, origin, destination } = useRoute();
  const { selectedProfile } = useProfile();
  const { themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeRoute && MOCK_ROUTES.length > 0) setActiveRoute(MOCK_ROUTES[0]);
  }, []);

  const handleRouteSelect = (route: Route) => setActiveRoute(route);

  const frictionColor =
    activeRoute?.overallFriction === 'low' ? '#10b981' :
    activeRoute?.overallFriction === 'medium' ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: th.headerBg, borderBottomColor: th.border }]}>
        <TouchableOpacity onPress={() => navigate('/search')} style={[styles.backButton, { backgroundColor: th.surface }]}>
          <Icons.ArrowLeft size={24} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.routeText, { color: th.text }]} numberOfLines={1}>{origin} to {destination}</Text>
          {selectedProfile && <ProfileBadge profile={selectedProfile} size="sm" />}
        </View>
      </View>

      <RouteMap
        origin={origin || ''}
        destination={destination || ''}
        frictionColor={frictionColor}
        isDark={th.isDark}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: th.textMuted }]}>Recommended Routes</Text>
        {MOCK_ROUTES.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={activeRoute?.id === route.id}
            onSelect={() => handleRouteSelect(route)}
          />
        ))}
      </ScrollView>

      {activeRoute && (
        <View style={[styles.footer, { backgroundColor: th.headerBg, borderTopColor: th.border }]}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { backgroundColor: th.surface, borderColor: th.border }, pressed && { opacity: 0.8 }]}
            onPress={() => navigate('/segment')}
          >
            <Text style={[styles.secondaryButtonText, { color: th.text }]}>Details</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            onPress={() => navigate('/navigate')}
          >
            <Text style={styles.primaryButtonText}>Start Navigation</Text>
            <Icons.Navigation2 size={20} color="#ffffff" />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40,
    gap: 16, borderBottomWidth: 1, zIndex: 10,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  routeText: { fontSize: 16, fontWeight: '700' },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 20, paddingBottom: 40,
    borderTopWidth: 1, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },
  primaryButton: {
    flex: 2, backgroundColor: '#3b82f6', height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  secondaryButton: {
    flex: 1, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '700' },
});
