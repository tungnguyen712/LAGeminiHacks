import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useLanguage, THEME_MODES } from '../store/LanguageContext';
import { FrictionBadge } from '../components/route/FrictionBadge';
import { RouteMap } from '../components/map/RouteMap';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const f1 = lat1 * Math.PI / 180, f2 = lat2 * Math.PI / 180;
  const df = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const NavigateScreen = () => {
  const { activeRoute, origin, destination } = useRoute();
  const { themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const navigate = useNavigate();

  const [currentSegmentIndex, setCurrentSegmentIndex] = React.useState(0);
  const [userPosition, setUserPosition] = React.useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = React.useState<'searching' | 'active' | 'unavailable'>('searching');

  const segRef = React.useRef(activeRoute?.segments[currentSegmentIndex]);
  const advancedRef = React.useRef(false);

  const segments = activeRoute?.segments ?? [];
  const currentSegment = segments[currentSegmentIndex];
  const isLast = currentSegmentIndex === segments.length - 1;

  // Keep segment ref up to date for the GPS callback
  React.useEffect(() => {
    segRef.current = currentSegment;
    advancedRef.current = false;
  }, [currentSegment]);

  React.useEffect(() => {
    if (!activeRoute) navigate('/results');
  }, [activeRoute]);

  // GPS live tracking — runs once for the lifetime of this screen
  React.useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPosition({ lat, lng });
        setGpsStatus('active');

        // Auto-advance when within 40 m of current segment's end
        const seg = segRef.current;
        if (seg?.endLat != null && seg?.endLng != null && !advancedRef.current) {
          const dist = haversine(lat, lng, seg.endLat, seg.endLng);
          if (dist < 40) {
            advancedRef.current = true;
            setCurrentSegmentIndex(i => {
              if (i < (activeRoute?.segments.length ?? 1) - 1) return i + 1;
              return i;
            });
          }
        }
      },
      () => setGpsStatus('unavailable'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeRoute || !currentSegment) return null;

  const frictionColor =
    currentSegment.friction === 'low' ? '#10b981' :
    currentSegment.friction === 'medium' ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <RouteMap
          origin={origin || ''}
          destination={destination || ''}
          frictionColor={frictionColor}
          height={300}
          isDark={th.isDark}
          segments={segments}
          userPosition={userPosition}
          centerOnUser={gpsStatus === 'active'}
        />

        {/* GPS status pill */}
        <View style={[styles.gpsPill, { backgroundColor: th.headerBg }]}>
          <View style={[styles.gpsDot, {
            backgroundColor: gpsStatus === 'active' ? '#10b981' : gpsStatus === 'searching' ? '#f59e0b' : '#94a3b8'
          }]} />
          <Text style={[styles.gpsText, { color: th.textSecondary }]}>
            {gpsStatus === 'active' ? 'GPS Live' : gpsStatus === 'searching' ? 'Locating…' : 'No GPS'}
          </Text>
        </View>

        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigate('/results')}
          style={[styles.closeButton, { backgroundColor: th.headerBg, borderColor: th.border }]}
        >
          <Icons.X size={20} color={th.text} />
        </TouchableOpacity>
      </View>

      {/* Instruction card */}
      <View style={[styles.card, { backgroundColor: th.headerBg, borderTopColor: th.border }]}>
        <View style={[styles.dragHandle, { backgroundColor: th.border }]} />

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { color: th.textMuted }]}>
            {currentSegmentIndex + 1} / {segments.length}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: th.surface }]}>
            <View style={[
              styles.progressFill,
              { width: `${((currentSegmentIndex + 1) / segments.length) * 100}%` as any, backgroundColor: frictionColor }
            ]} />
          </View>
        </View>

        {/* Direction + instruction */}
        <View style={styles.header}>
          <View style={[styles.directionIcon, { backgroundColor: frictionColor }]}>
            <Icons.ArrowUpRight size={26} color="#ffffff" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.distance, { color: th.text }]}>{currentSegment.distance}</Text>
            <Text style={[styles.instruction, { color: th.textSecondary }]}>
              {currentSegment.instruction}
            </Text>
          </View>
        </View>

        {/* Friction + details */}
        {(currentSegment.friction !== 'low' || currentSegment.details) && (
          <View style={[styles.frictionRow, { backgroundColor: th.surface, borderColor: th.border }]}>
            <FrictionBadge level={currentSegment.friction} />
            {currentSegment.details ? (
              <Text style={[styles.detailsText, { color: th.textSecondary }]}>
                {currentSegment.details}
              </Text>
            ) : null}
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.footer}>
          {currentSegmentIndex > 0 && (
            <TouchableOpacity
              style={[styles.prevBtn, { backgroundColor: th.surface, borderColor: th.border }]}
              onPress={() => setCurrentSegmentIndex(i => i - 1)}
            >
              <Icons.ChevronLeft size={20} color={th.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: frictionColor }]}
            onPress={() => {
              if (isLast) navigate('/results');
              else setCurrentSegmentIndex(i => i + 1);
            }}
          >
            <Text style={styles.nextBtnText}>{isLast ? 'Finish' : 'Next Step'}</Text>
            {isLast
              ? <Icons.CheckCircle size={18} color="#ffffff" />
              : <Icons.ChevronRight size={18} color="#ffffff" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  mapContainer: { position: 'relative' } as any,
  gpsPill: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  } as any,
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsText: { fontSize: 11, fontWeight: '600' },
  closeButton: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  } as any,
  card: {
    flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32,
    gap: 14, borderTopWidth: 1,
  },
  dragHandle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { fontSize: 11, fontWeight: '700', width: 36 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 } as any,
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  directionIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerText: { flex: 1, gap: 3, paddingTop: 2 },
  distance: { fontSize: 20, fontWeight: '800' },
  instruction: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  frictionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  detailsText: { flex: 1, fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: 10 },
  prevBtn: {
    width: 46, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  nextBtn: {
    flex: 1, height: 50, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
