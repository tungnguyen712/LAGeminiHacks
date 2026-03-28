import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  ActivityIndicator, Animated,
} from 'react-native';

const SNAP_COLLAPSED = 320;
const SNAP_EXPANDED  = 620;
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
import { rerouteSegment } from '../services/api';
import { LiveAssistant } from '../components/voice/LiveAssistant';
import { ReportButton, ReportPanel } from '../components/ReportButton';

export const ResultsScreen = () => {
  const { activeRoute, setActiveRoute, origin, originLabel, destination, destinationLabel, setDestination, routes, isLoading, error, loadRoutes, transitMode, setTransitMode } = useRoute();
  const { selectedProfile } = useProfile();
  const { themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const navigate = useNavigate();

  const [clickedSegment, setClickedSegment] = useState<RouteSegment | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const [rerouteError, setRerouteError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // Bottom sheet — Pointer Events drag (works for mouse + touch)
  const sheetAnim = useRef(new Animated.Value(SNAP_COLLAPSED)).current;
  const heightRef = useRef(SNAP_COLLAPSED);
  const snapTo = (h: number) => {
    heightRef.current = h;
    Animated.spring(sheetAnim, { toValue: h, useNativeDriver: false, friction: 10, tension: 100 }).start();
  };
  const handleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;
    let startY = 0;
    let startH = SNAP_COLLAPSED;
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      startY = e.clientY;
      startH = heightRef.current;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      const newH = Math.max(160, Math.min(700, startH - (e.clientY - startY)));
      sheetAnim.setValue(newH);
    };
    const onUp = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      el.releasePointerCapture(e.pointerId);
      const currentH = Math.max(160, Math.min(700, startH - (e.clientY - startY)));
      snapTo(currentH > (SNAP_COLLAPSED + SNAP_EXPANDED) / 2 ? SNAP_EXPANDED : SNAP_COLLAPSED);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
  }, []);


  const handleReroute = async () => {
    if (!clickedSegment || !activeRoute || !selectedProfile) return;
    setIsRerouting(true);
    setRerouteError(null);
    try {
      const replacements = await rerouteSegment(clickedSegment, selectedProfile.id);
      const newSegments = activeRoute.segments.flatMap(s =>
        s.id === clickedSegment.id ? replacements : [s]
      );
      setActiveRoute({ ...activeRoute, segments: newSegments });
      setClickedSegment(null);
    } catch {
      setRerouteError('No detour found for this segment.');
    } finally {
      setIsRerouting(false);
    }
  };

  useEffect(() => {
    if (selectedProfile) {
      loadRoutes(selectedProfile.id);
    }
  }, [origin, destination]);

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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: th.headerBg, borderBottomColor: th.border }]}>
        <TouchableOpacity onPress={() => navigate('/search')} style={[styles.backButton, { backgroundColor: th.surface }]}>
          <Icons.ArrowLeft size={24} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.routeText, { color: th.text }]} numberOfLines={1}>{originLabel || origin} → {destinationLabel || destination}</Text>
          {selectedProfile && <ProfileBadge profile={selectedProfile} size="sm" />}
        </View>
        <LiveAssistant />
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

      {/* Map fills all space below header */}
      <View style={styles.mapWrapper}>
        <RouteMap
          origin={origin || ''}
          destination={destination || ''}
          frictionColor={frictionColor}
          isDark={th.isDark}
          segments={activeRoute?.segments}
          onSegmentClick={setClickedSegment}
          fitPaddingBottom={SNAP_COLLAPSED + 20}
          onMapClick={(coords, label) => {
            setDestination(coords, label);
            if (selectedProfile) loadRoutes(selectedProfile.id);
          }}
        />
      </View>

      {/* Bottom sheet — draggable overlay, map always full-screen behind it */}
      <Animated.View style={[styles.sheet, { height: sheetAnim, backgroundColor: th.headerBg, borderColor: th.border }]}>
        <div ref={handleRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', cursor: 'grab', touchAction: 'none', userSelect: 'none' } as React.CSSProperties}>
          <View style={[styles.handle, { backgroundColor: th.border }]} />
        </div>

        {/* Segment callout */}
        {clickedSegment && (
          <View style={[styles.callout, { backgroundColor: th.surface, borderColor: th.border }]}>
            <View style={styles.calloutHeader}>
              <Text style={[styles.calloutInstruction, { color: th.text }]}>
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
            {clickedSegment.details ? (
              <Text style={[styles.calloutDetails, { color: th.textSecondary }]}>{clickedSegment.details}</Text>
            ) : null}
            {clickedSegment.friction === 'high' && (
              <TouchableOpacity
                style={[styles.rerouteBtn, isRerouting && { opacity: 0.6 }]}
                onPress={handleReroute}
                disabled={isRerouting}
              >
                {isRerouting
                  ? <ActivityIndicator size="small" color="#ffffff" />
                  : <Icons.RefreshCw size={15} color="#ffffff" />}
                <Text style={styles.rerouteBtnText}>
                  {isRerouting ? 'Finding detour…' : 'Reroute around this'}
                </Text>
              </TouchableOpacity>
            )}
            {rerouteError ? (
              <Text style={styles.rerouteError}>{rerouteError}</Text>
            ) : null}
          </View>
        )}

        {/* Report panel — replaces routes list when open */}
        {reportOpen && activeRoute && (
          <ReportPanel
            lat={activeRoute.segments[0]?.startLat ?? 0}
            lng={activeRoute.segments[0]?.startLng ?? 0}
            profile={selectedProfile?.id ?? ''}
            th={th}
            onClose={() => setReportOpen(false)}
          />
        )}

        {/* Routes list */}
        <ScrollView
          style={[styles.sheetScroll, reportOpen && { display: 'none' }]}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
        >
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
          ) : (() => {
            const displayed = transitMode === 'all'
              ? routes.filter(r => r.mode === 'transit')
              : routes.filter(r => r.mode !== 'transit');
            const empty = displayed.length === 0;
            return (
              <>
                <Text style={[styles.sectionTitle, { color: th.textMuted }]}>Recommended Routes</Text>
                {empty ? (
                  <View style={styles.center}>
                    <Icons.MapPinOff size={28} color={th.textMuted} />
                    <Text style={[styles.statusText, { color: th.textMuted }]}>
                      {transitMode === 'all' ? 'No transit routes found.' : 'No walking routes found.'}
                    </Text>
                  </View>
                ) : displayed.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    isSelected={activeRoute?.id === route.id}
                    onSelect={() => handleRouteSelect(route)}
                    onViewSegments={() => { setActiveRoute(route); navigate('/segment'); }}
                  />
                ))}
              </>
            );
          })()}
        </ScrollView>

        {/* Footer buttons inside sheet */}
        {activeRoute && !isLoading && (
          <View style={[styles.sheetFooter, { borderTopColor: th.border }]}>
            {!reportOpen && (
              <ReportButton th={th} onPress={() => setReportOpen(true)} />
            )}
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              onPress={() => navigate('/navigate')}
            >
              <Text style={styles.primaryButtonText}>Start Navigation</Text>
              <Icons.Navigation2 size={20} color="#ffffff" />
            </Pressable>
          </View>
        )}
      </Animated.View>
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
  mapWrapper: { flex: 1 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  } as any,
  handle: { width: 36, height: 4, borderRadius: 2 },
  callout: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 8,
  },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calloutInstruction: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  calloutClose: { paddingLeft: 4, flexShrink: 0 },
  calloutMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calloutDistance: { fontSize: 13 },
  calloutDetails: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  rerouteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ef4444', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, marginTop: 4,
  },
  rerouteBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  rerouteError: { fontSize: 12, color: '#ef4444', marginTop: 2 },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { padding: 16, paddingTop: 4, paddingBottom: 8, gap: 0 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  statusText: { fontSize: 15, textAlign: 'center' },
  retryButton: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: '#3b82f6', borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  sheetFooter: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
    gap: 12, borderTopWidth: 1,
  },
  primaryButton: {
    flex: 2, backgroundColor: '#3b82f6', height: 52, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  secondaryButton: {
    flex: 1, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700' },
  modeToggle: {
    flexDirection: 'row', borderRadius: 10, borderWidth: 1,
    overflow: 'hidden', flexShrink: 0,
  },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  modeBtnActive: { backgroundColor: '#3b82f6' },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  modeBtnTextActive: { color: '#ffffff' },
});
