import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useLanguage, THEME_MODES } from '../store/LanguageContext';
import { TTSAlert } from '../components/voice/TTSAlert';
import { FrictionBadge } from '../components/route/FrictionBadge';
import { RouteMap } from '../components/map/RouteMap';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NavigateScreen = () => {
  const { activeRoute, origin, destination } = useRoute();
  const { themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const [currentSegmentIndex, setCurrentSegmentIndex] = React.useState(0);
  const [showTTS, setShowTTS] = React.useState(false);
  const [ttsMessage, setTtsMessage] = React.useState('');
  const navigate = useNavigate();

  const currentSegment = activeRoute?.segments[currentSegmentIndex];

  React.useEffect(() => {
    if (currentSegment) {
      const message = `In ${currentSegment.distance}, ${currentSegment.instruction}. ${currentSegment.details || ''}`;
      setTtsMessage(message);
      setShowTTS(true);
      const timer = setTimeout(() => setShowTTS(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentSegmentIndex, currentSegment]);

  React.useEffect(() => {
    if (!activeRoute) navigate('/results');
  }, [activeRoute, navigate]);

  const handleNext = () => {
    if (activeRoute && currentSegmentIndex < activeRoute.segments.length - 1) {
      setCurrentSegmentIndex(currentSegmentIndex + 1);
    } else {
      navigate('/results');
    }
  };

  if (!activeRoute || !currentSegment) return null;

  const frictionColor =
    currentSegment.friction === 'low' ? '#10b981' :
    currentSegment.friction === 'medium' ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.container}>
      <TTSAlert isVisible={showTTS} message={ttsMessage} />

      <View style={styles.mapContainer}>
        <RouteMap origin={origin || ''} destination={destination || ''} frictionColor={frictionColor} height={320} isDark={th.isDark} />
        <View style={styles.mapOverlay}>
          <TouchableOpacity onPress={() => navigate('/results')} style={[styles.closeButton, { backgroundColor: th.headerBg, borderColor: th.border }]}>
            <Icons.X size={24} color={th.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.instructionCard, { backgroundColor: th.headerBg, borderTopColor: th.border }]}>
        <View style={[styles.dragHandle, { backgroundColor: th.border }]} />

        <View style={styles.header}>
          <View style={styles.directionIcon}>
            <Icons.ArrowUpRight size={32} color="#ffffff" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.distance, { color: th.text }]}>{currentSegment.distance}</Text>
            <Text style={[styles.instruction, { color: th.textSecondary }]}>{currentSegment.instruction}</Text>
          </View>
        </View>

        <View style={[styles.frictionSection, { backgroundColor: th.surface, borderColor: th.border }]}>
          <FrictionBadge level={currentSegment.friction} />
          {currentSegment.details && (
            <View style={styles.details}>
              <Icons.AlertCircle size={16} color="#ef4444" />
              <Text style={styles.detailsText}>{currentSegment.details}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentSegmentIndex === activeRoute.segments.length - 1 ? 'Finish' : 'Next Step'}
            </Text>
            <Icons.ChevronRight size={20} color="#ffffff" />
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
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  instructionCard: {
    flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: 40, gap: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
    borderTopWidth: 1,
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  directionIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#3b82f6',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  headerText: { flex: 1, gap: 4 },
  distance: { fontSize: 24, fontWeight: '800' },
  instruction: { fontSize: 18, fontWeight: '600' },
  frictionSection: { padding: 16, borderRadius: 16, gap: 12, borderWidth: 1 },
  details: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailsText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  nextButton: {
    flex: 1, backgroundColor: '#3b82f6', height: 56, paddingHorizontal: 24,
    borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
