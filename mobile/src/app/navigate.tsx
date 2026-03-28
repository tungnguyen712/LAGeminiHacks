import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useLanguage, THEME_MODES } from '../store/LanguageContext';
import { FrictionBadge } from '../components/route/FrictionBadge';
import { RouteMap } from '../components/map/RouteMap';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NavigateScreen = () => {
  const { activeRoute, origin, destination } = useRoute();
  const { themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const [currentSegmentIndex, setCurrentSegmentIndex] = React.useState(0);
  const navigate = useNavigate();

  const segments = activeRoute?.segments ?? [];
  const currentSegment = segments[currentSegmentIndex];
  const isLast = currentSegmentIndex === segments.length - 1;

  React.useEffect(() => {
    if (!activeRoute) navigate('/results');
  }, [activeRoute]);

  if (!activeRoute || !currentSegment) return null;

  const frictionColor =
    currentSegment.friction === 'low' ? '#10b981' :
    currentSegment.friction === 'medium' ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <RouteMap
          origin={origin || ''}
          destination={destination || ''}
          frictionColor={frictionColor}
          height={300}
          isDark={th.isDark}
          segments={segments}
        />
        <View style={styles.mapOverlay}>
          <TouchableOpacity
            onPress={() => navigate('/results')}
            style={[styles.closeButton, { backgroundColor: th.headerBg, borderColor: th.border }]}
          >
            <Icons.X size={22} color={th.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: th.headerBg, borderTopColor: th.border }]}>
        <View style={[styles.dragHandle, { backgroundColor: th.border }]} />

        {/* Progress */}
        <View style={styles.progress}>
          <Text style={[styles.progressText, { color: th.textMuted }]}>
            Step {currentSegmentIndex + 1} of {segments.length}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: th.surface }]}>
            <View style={[styles.progressFill, { width: `${((currentSegmentIndex + 1) / segments.length) * 100}%` as any, backgroundColor: frictionColor }]} />
          </View>
        </View>

        {/* Direction */}
        <View style={styles.header}>
          <View style={[styles.directionIcon, { backgroundColor: frictionColor }]}>
            <Icons.ArrowUpRight size={28} color="#ffffff" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.distance, { color: th.text }]}>{currentSegment.distance}</Text>
            <Text style={[styles.instruction, { color: th.textSecondary }]} numberOfLines={3}>
              {currentSegment.instruction}
            </Text>
          </View>
        </View>

        {/* Friction */}
        <View style={[styles.frictionRow, { backgroundColor: th.surface, borderColor: th.border }]}>
          <FrictionBadge level={currentSegment.friction} />
          {currentSegment.details ? (
            <Text style={[styles.detailsText, { color: th.textSecondary }]} numberOfLines={2}>
              {currentSegment.details}
            </Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.footer}>
          {currentSegmentIndex > 0 && (
            <TouchableOpacity
              style={[styles.prevButton, { backgroundColor: th.surface, borderColor: th.border }]}
              onPress={() => setCurrentSegmentIndex(i => i - 1)}
            >
              <Icons.ChevronLeft size={20} color={th.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: frictionColor }]}
            onPress={() => {
              if (isLast) navigate('/results');
              else setCurrentSegmentIndex(i => i + 1);
            }}
          >
            <Text style={styles.nextButtonText}>{isLast ? 'Finish' : 'Next Step'}</Text>
            {isLast ? <Icons.CheckCircle size={20} color="#ffffff" /> : <Icons.ChevronRight size={20} color="#ffffff" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  mapContainer: { position: 'relative' } as any,
  mapOverlay: { position: 'absolute', top: 16, right: 16 } as any,
  closeButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  card: {
    flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
    gap: 16, borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 16,
  },
  dragHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  progress: { gap: 6 },
  progressText: { fontSize: 12, fontWeight: '600' },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 } as any,
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  directionIcon: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerText: { flex: 1, gap: 4, paddingTop: 2 },
  distance: { fontSize: 22, fontWeight: '800' },
  instruction: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  frictionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  detailsText: { flex: 1, fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 4 },
  prevButton: {
    width: 48, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  nextButton: {
    flex: 1, height: 52, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
