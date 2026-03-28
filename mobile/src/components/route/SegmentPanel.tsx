import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { RouteSegment } from '../../types/Route';
import { FrictionBadge } from './FrictionBadge';
import { ConfidenceMeter } from './ConfidenceMeter';
import * as Icons from 'lucide-react';

interface SegmentPanelProps {
  segments: RouteSegment[];
}

export const SegmentPanel = ({ segments }: SegmentPanelProps) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Route Segments</Text>
      {segments.map((segment, index) => (
        <View key={segment.id} style={styles.segment}>
          <View style={styles.timeline}>
            <View style={styles.dot} />
            {index < segments.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.info}>
            <View style={styles.header}>
              <Text style={styles.instruction}>{segment.instruction}</Text>
              <FrictionBadge level={segment.friction} size="sm" />
            </View>
            <View style={styles.meta}>
              <Text style={styles.distance}>{segment.distance}</Text>
              <ConfidenceMeter confidence={segment.confidence} size="sm" />
            </View>
            {segment.details && (
              <View style={styles.details}>
                <Icons.Info size={12} color="#64748b" />
                <Text style={styles.detailsText}>{segment.details}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  segment: {
    flexDirection: 'row',
    gap: 16,
  },
  timeline: {
    alignItems: 'center',
    width: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  info: {
    flex: 1,
    gap: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  instruction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  distance: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 8,
  },
  detailsText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
