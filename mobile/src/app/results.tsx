import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useProfile } from '../store/ProfileContext';
import { useLanguage, THEME_MODES } from '../store/LanguageContext';
import { RouteMap } from '../components/map/RouteMap';
import { RouteCard } from '../components/route/RouteCard';
import { FrictionBadge } from '../components/route/FrictionBadge';
import { ProfileBadge } from '../components/profile/ProfileBadge';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Route, RouteSegment } from '../types/Route';

export const ResultsScreen = () => {
  const { activeRoute, setActiveRoute, origin, destination, routes, isLoading, error, loadRoutes, transitMode, setTransitMode } = useRoute();
  const { selectedProfile } = useProfile();
  const { themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const navigate = useNavigate();

  const [clickedSegment, setClickedSegment] = useState<RouteSegment | null>(null);

  useEffect(() => {
    if (selectedProfile) {
      loadRoutes(selectedProfile.id);
    }
  }, [origin, destination]);

  // Clear segment callout when active route changes
  useEffect(() => {
    setClickedSegment(null);
  }, [activeRoute?.id]);

  const handleRouteSelect = (route: Route) => {
    setActiveRoute(route);
    setClickedSegment(null);
  };

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
        <View style={[styles.modeToggle, { backgroundColor: th.surface, borderColor: th.border }]}>
          {(['walk', 'all'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, transitMode === m && styles.modeBtnActive]}
              onPress={() => {
                setTransitMode(m);
                if (selectedProfile) loadRoutes(selectedProfile.id, undefined, m);
              }}
            >
              <Text style={[styles.modeBtnText, transitMode === m && styles.modeBtnTextActive]}>
                {m === 'walk' ? 'Walk' : '+ Transit'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <RouteMap
        origin={origin || ''}
        destination={destination || ''}
        frictionColor={frictionColor}
        isDark={th.isDark}
        segments={activeRoute?.segments}
        onSegmentClick={setClickedSegment}
      />

      {/* Segment callout — appears below map when a polyline is tapped */}
      {clickedSegment && (
        <View style={[styles.callout, { backgroundColor: th.headerBg, borderColor: th.border }]}>
          <View style={styles.calloutHeader}>
            <Text style={[styles.calloutInstruction, { color: th.text }]} numberOfLines={2}>
              {clickedSegment.instruction}
            </Text>
            <TouchableOpacity onPress={() => setClickedSegment(null)} style={styles.calloutClose}>
              <Icons.X size={18} color={th.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.calloutMeta}>
            <FrictionBadge level={clickedSegment.friction} size="sm" />
            <Text style={[styles.calloutDistance, { color: th.textSecondary }]}>{clickedSegment.distance}</Text>
          </View>
          {clickedSegment.details && (
            <Text style={[styles.calloutDetails, { color: th.textSecondary }]}>{clickedSegment.details}</Text>
          )}
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={[styles.statusText, { color: th.textSecondary }]}>
              Scoring accessibility...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Icons.AlertCircle size={32} color="#ef4444" />
            <Text style={[styles.statusText, { color: '#ef4444' }]}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => selectedProfile && loadRoutes(selectedProfile.id)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : routes.length === 0 ? (
          <View style={styles.center}>
            <Icons.MapPinOff size={32} color={th.textMuted} />
            <Text style={[styles.statusText, { color: th.textMuted }]}>No routes found.</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: th.textMuted }]}>Recommended Routes</Text>
            {routes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isSelected={activeRoute?.id === route.id}
                onSelect={() => handleRouteSelect(route)}
                onViewSegments={() => { setActiveRoute(route); navigate('/segment'); }}
              />
            ))}
          </>
        )}
      </ScrollView>

      {activeRoute && !isLoading && (
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  statusText: { fontSize: 15, textAlign: 'center' },
  retryButton: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: '#3b82f6', borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  callout: {
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calloutInstruction: { flex: 1, fontSize: 14, fontWeight: '600' },
  calloutClose: { padding: 2 },
  calloutMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calloutDistance: { fontSize: 13 },
  calloutDetails: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
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
  modeToggle: {
    flexDirection: 'row', borderRadius: 10, borderWidth: 1,
    overflow: 'hidden', flexShrink: 0,
  },
  modeBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
  },
  modeBtnActive: { backgroundColor: '#3b82f6' },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  modeBtnTextActive: { color: '#ffffff' },
});
