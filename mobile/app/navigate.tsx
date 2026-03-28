import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '../store/RouteContext';
import { FrictionBadge } from '../components/route/FrictionBadge';
import { TTSAlert } from '../components/voice/TTSAlert';

export default function NavigateScreen() {
  const { activeRoute } = useRoute();
  const router = useRouter();
  const [currentSegmentIndex, setCurrentSegmentIndex] = React.useState(0);
  const [showTTS, setShowTTS] = React.useState(false);
  const [ttsMessage, setTtsMessage] = React.useState('');

  const currentSegment = activeRoute?.segments[currentSegmentIndex];

  // Redirect if no active route
  React.useEffect(() => {
    if (!activeRoute) {
      router.replace('/results');
    }
  }, [activeRoute]);

  // Trigger TTS on segment change
  React.useEffect(() => {
    if (currentSegment) {
      const message = `In ${currentSegment.distance}, ${currentSegment.instruction}. ${
        currentSegment.details || ''
      }`;
      setTtsMessage(message);
      setShowTTS(true);
      const timer = setTimeout(() => setShowTTS(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentSegmentIndex]);

  const handleNext = () => {
    if (activeRoute && currentSegmentIndex < activeRoute.segments.length - 1) {
      setCurrentSegmentIndex(currentSegmentIndex + 1);
    } else {
      router.push('/results');
    }
  };

  if (!activeRoute || !currentSegment) {
    return null;
  }

  const isLastSegment = currentSegmentIndex === activeRoute.segments.length - 1;

  return (
    <View style={styles.container}>
      <TTSAlert isVisible={showTTS} message={ttsMessage} />

      {/* Map area placeholder */}
      <View style={styles.mapPlaceholder}>
        <Ionicons name="navigate" size={48} color="rgba(59,130,246,0.3)" style={styles.navIcon} />
        <View style={styles.mapOverlay}>
          <TouchableOpacity onPress={() => router.push('/results')} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        {/* Progress indicator */}
        <View style={styles.progressBar}>
          {activeRoute.segments.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressDot,
                idx === currentSegmentIndex && styles.progressDotActive,
                idx < currentSegmentIndex && styles.progressDotDone,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Instruction card */}
      <View style={styles.instructionCard}>
        <View style={styles.dragHandle} />

        <View style={styles.cardHeader}>
          <View style={styles.directionIcon}>
            <Ionicons name="arrow-up-circle" size={32} color="#ffffff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.distance}>{currentSegment.distance}</Text>
            <Text style={styles.instruction}>{currentSegment.instruction}</Text>
          </View>
        </View>

        <View style={styles.frictionSection}>
          <FrictionBadge level={currentSegment.friction} />
          {currentSegment.details && (
            <View style={styles.details}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.detailsText}>{currentSegment.details}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>{isLastSegment ? 'Finish' : 'Next Step'}</Text>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  navIcon: {
    opacity: 0.3,
  },
  mapOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    backgroundColor: '#3b82f6',
    width: 20,
  },
  progressDotDone: {
    backgroundColor: '#10b981',
  },
  instructionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  directionIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  distance: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  instruction: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
  },
  frictionSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#f87171',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
