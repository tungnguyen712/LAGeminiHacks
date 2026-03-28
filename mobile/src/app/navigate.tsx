import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useProfile } from '../store/ProfileContext';
import { useLanguage, THEME_MODES } from '../store/LanguageContext';
import { FrictionBadge } from '../components/route/FrictionBadge';
import { RouteMap } from '../components/map/RouteMap';
import { TTSAlert } from '../components/voice/TTSAlert';
import { fetchTTS, fetchRoutes } from '../services/api';
import { subscribeToNearbyReports, AccessibilityReport } from '../services/reports';
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
  const { activeRoute, setActiveRoute, origin, destination } = useRoute();
  const { selectedProfile } = useProfile();
  const { themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const navigate = useNavigate();

  const [currentSegmentIndex, setCurrentSegmentIndex] = React.useState(0);
  const [userPosition, setUserPosition] = React.useState<{ lat: number; lng: number } | null>(null);
  const [userHeading, setUserHeading] = React.useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = React.useState<'searching' | 'active' | 'unavailable'>('searching');
  const [ttsEnabled, setTtsEnabled] = React.useState(false);
  const [ttsMessage, setTtsMessage] = React.useState('');
  const [ttsVisible, setTtsVisible] = React.useState(false);
  const [isRerouting, setIsRerouting] = React.useState(false);
  const [rerouteError, setRerouteError] = React.useState<string | null>(null);
  const [cardCollapsed, setCardCollapsed] = React.useState(false);
  const cardAnim = React.useRef(new Animated.Value(0)).current;
  const [barrierAlert, setBarrierAlert] = React.useState<{ message: string; type: 'friction' | 'report' } | null>(null);
  const alertDismissedForSegment = React.useRef<number>(-1);
  const reportAlertDismissed = React.useRef(false); // 0 = expanded, 1 = collapsed
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const prefetchRef = React.useRef<{ index: number; b64: string | null }>({ index: -1, b64: null });

  const handleReroute = async () => {
    if (!activeRoute || !destination) return;
    if (!userPosition) {
      setRerouteError('Waiting for GPS…');
      setTimeout(() => setRerouteError(null), 3000);
      return;
    }
    setIsRerouting(true);
    setRerouteError(null);
    try {
      // Re-route from exact current GPS position to the original destination
      const newOrigin = `${userPosition.lat},${userPosition.lng}`;
      const newRoutes = await fetchRoutes(newOrigin, destination, selectedProfile?.id ?? 'wheelchair');
      if (newRoutes.length === 0) throw new Error('No routes found');
      setActiveRoute(newRoutes[0]);
      setCurrentSegmentIndex(0);
    } catch {
      setRerouteError('No route found from here. Try moving slightly.');
      setTimeout(() => setRerouteError(null), 3000);
    } finally {
      setIsRerouting(false);
    }
  };

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

  // Alert: next segment is HIGH friction
  React.useEffect(() => {
    const nextSeg = segments[currentSegmentIndex + 1];
    if (!nextSeg || nextSeg.friction !== 'high') return;
    if (alertDismissedForSegment.current === currentSegmentIndex) return;
    setBarrierAlert({
      type: 'friction',
      message: `High friction ahead: ${nextSeg.details || nextSeg.instruction}`,
    });
  }, [currentSegmentIndex, segments]);

  // Alert: crowd report within 50m of user position
  React.useEffect(() => {
    if (!userPosition) return;
    const unsub = subscribeToNearbyReports(
      userPosition.lat, userPosition.lng,
      0.0005, // ~50m in degrees
      (reports: AccessibilityReport[]) => {
        const barrier = reports.find(r =>
          r.category === 'blocked_path' || r.category === 'broken_ramp'
        );
        if (barrier && !reportAlertDismissed.current) {
          setBarrierAlert({
            type: 'report',
            message: `Reported ${barrier.category.replace(/_/g, ' ')} nearby${barrier.note ? ': ' + barrier.note : ''}`,
          });
        }
      }
    );
    return () => unsub();
  }, [userPosition?.lat, userPosition?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Speak instruction whenever segment changes or TTS is toggled on
  React.useEffect(() => {
    if (!currentSegment || !ttsEnabled) {
      audioRef.current?.pause();
      audioRef.current = null;
      setTtsVisible(false);
      return;
    }
    let aborted = false;

    audioRef.current?.pause();
    audioRef.current = null;

    const segText = (seg: typeof currentSegment) =>
      seg.instruction + (seg.friction !== 'low' && seg.details ? '. ' + seg.details : '');

    const text = segText(currentSegment);
    setTtsMessage(text);
    setTtsVisible(true);

    const playB64 = (b64: string) => {
      if (aborted) return;
      const audio = new Audio(`data:audio/wav;base64,${b64}`);
      audioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => setTtsVisible(false);

      // Prefetch next segment while current plays
      const nextSeg = segments[currentSegmentIndex + 1];
      if (nextSeg) {
        prefetchRef.current = { index: currentSegmentIndex + 1, b64: null };
        fetchTTS(segText(nextSeg)).then(nb64 => {
          if (prefetchRef.current.index === currentSegmentIndex + 1)
            prefetchRef.current.b64 = nb64;
        });
      }
    };

    // Use prefetch cache if available, else fetch now
    const cached = prefetchRef.current;
    if (cached.index === currentSegmentIndex && cached.b64) {
      prefetchRef.current = { index: -1, b64: null };
      playB64(cached.b64);
    } else {
      fetchTTS(text).then(b64 => { if (!aborted && b64) playB64(b64); });
    }

    return () => {
      aborted = true;
      audioRef.current?.pause();
      audioRef.current = null;
      setTtsVisible(false);
    };
  }, [currentSegmentIndex, ttsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // GPS live tracking — runs once for the lifetime of this screen
  React.useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading } = pos.coords;
        setUserPosition({ lat, lng });
        if (heading !== null) setUserHeading(heading);
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

  const toggleCard = () => {
    const toValue = cardCollapsed ? 0 : 1;
    setCardCollapsed(!cardCollapsed);
    Animated.spring(cardAnim, { toValue, useNativeDriver: false, friction: 12, tension: 120 }).start();
  };

  return (
    <View style={styles.container}>
      <TTSAlert message={ttsMessage} isVisible={ttsVisible} />

      {/* Map — always fills full screen */}
      <View style={styles.mapFull}>
        <RouteMap
          origin={origin || ''}
          destination={destination || ''}
          frictionColor={frictionColor}
          isDark={th.isDark}
          segments={segments}
          userPosition={userPosition}
          userHeading={userHeading}
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

      {/* Barrier alert banner */}
      {barrierAlert && (
        <View style={[styles.alertBanner, { backgroundColor: barrierAlert.type === 'friction' ? 'rgba(245,158,11,0.95)' : 'rgba(239,68,68,0.95)' }]}>
          <Icons.TriangleAlert size={18} color="#fff" />
          <Text style={styles.alertText} numberOfLines={2}>{barrierAlert.message}</Text>
          <View style={styles.alertActions}>
            <TouchableOpacity
              style={styles.alertRerouteBtn}
              onPress={() => {
                setBarrierAlert(null);
                alertDismissedForSegment.current = currentSegmentIndex;
                reportAlertDismissed.current = true;
                handleReroute();
              }}
            >
              <Text style={styles.alertRerouteText}>Reroute</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                alertDismissedForSegment.current = currentSegmentIndex;
                reportAlertDismissed.current = true;
                setBarrierAlert(null);
              }}
            >
              <Icons.X size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Collapsed pill — shown when card is swiped down */}
      {cardCollapsed && (
        <TouchableOpacity
          style={[styles.collapsedPill, { backgroundColor: th.headerBg, borderColor: th.border }]}
          onPress={toggleCard}
        >
          <View style={[styles.pillIcon, { backgroundColor: frictionColor }]}>
            <Icons.ArrowUpRight size={16} color="#fff" />
          </View>
          <Text style={[styles.pillDistance, { color: th.text }]}>{currentSegment.distance}</Text>
          <Text style={[styles.pillInstruction, { color: th.textSecondary }]} numberOfLines={1}>
            {currentSegment.instruction}
          </Text>
          <Icons.ChevronUp size={18} color={th.textMuted} />
        </TouchableOpacity>
      )}

      {/* Instruction card — overlays map from bottom */}
      {!cardCollapsed && (
        <View style={[styles.card, { backgroundColor: th.headerBg, borderTopColor: th.border }]}>
          {/* Drag handle — tap or swipe down to collapse */}
          <TouchableOpacity onPress={toggleCard} style={styles.dragHandleRow}>
            <View style={[styles.dragHandle, { backgroundColor: th.border }]} />
          </TouchableOpacity>

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

          {rerouteError && (
            <Text style={styles.rerouteError}>{rerouteError}</Text>
          )}

          {/* Navigation buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.voiceBtn, { backgroundColor: ttsEnabled ? '#3b82f6' : th.surface, borderColor: ttsEnabled ? '#3b82f6' : th.border }]}
              onPress={() => setTtsEnabled(v => !v)}
            >
              {ttsEnabled
                ? <Icons.Volume2 size={20} color="#ffffff" />
                : <Icons.VolumeX size={20} color={th.textSecondary} />}
            </TouchableOpacity>
            {currentSegmentIndex > 0 && (
              <TouchableOpacity
                style={[styles.prevBtn, { backgroundColor: th.surface, borderColor: th.border }]}
                onPress={() => setCurrentSegmentIndex(i => i - 1)}
              >
                <Icons.ChevronLeft size={20} color={th.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.rerouteBtn, { borderColor: isRerouting ? th.border : '#ef4444' }, isRerouting && { opacity: 0.6 }]}
              onPress={handleReroute}
              disabled={isRerouting}
            >
              {isRerouting
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Icons.TriangleAlert size={18} color="#ef4444" />}
            </TouchableOpacity>
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', position: 'relative' } as any,
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
    position: 'absolute' as any, bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32,
    gap: 14, borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12,
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
  voiceBtn: {
    width: 46, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  prevBtn: {
    width: 46, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  nextBtn: {
    flex: 1, height: 50, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  rerouteBtn: {
    width: 46, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    backgroundColor: 'rgba(239,68,68,0.08)', cursor: 'pointer' as any,
  },
  rerouteError: { fontSize: 12, color: '#ef4444', textAlign: 'center' },
  mapFull: { flex: 1, position: 'relative' } as any,
  collapsedPill: {
    position: 'absolute' as any, bottom: 24, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    cursor: 'pointer' as any,
  },
  pillIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pillDistance: { fontSize: 15, fontWeight: '800', flexShrink: 0 },
  pillInstruction: { flex: 1, fontSize: 13, fontWeight: '500' },
  dragHandleRow: { alignItems: 'center', paddingVertical: 4 },
  alertBanner: {
    position: 'absolute' as any, top: 60, left: 12, right: 12,
    borderRadius: 16, padding: 14, gap: 8,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10,
    zIndex: 100,
  } as any,
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#fff', lineHeight: 18 },
  alertActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertRerouteBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  alertRerouteText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
