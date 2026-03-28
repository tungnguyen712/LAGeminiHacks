import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteSegment } from '../../types/Route';
import { FrictionBadge } from './FrictionBadge';
import * as Icons from 'lucide-react';

interface SegmentPanelProps {
  segments: RouteSegment[];
}

const DETAILS_BG: Record<string, string> = {
  high:   '#fee2e2',
  medium: '#fef9c3',
  low:    '#f0fdf4',
};

export const SegmentPanel = ({ segments }: SegmentPanelProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Route Segments</Text>
      {segments.map((segment, index) => {
        const isExpanded = expandedId === segment.id;
        const isLast = index === segments.length - 1;
        const showBadge = segment.friction !== 'low';

        return (
          <TouchableOpacity
            key={segment.id}
            style={styles.segment}
            onPress={() => toggle(segment.id)}
            activeOpacity={0.75}
          >
            {/* Timeline */}
            <View style={styles.timeline}>
              <View style={[styles.dot, { backgroundColor: segment.friction === 'high' ? '#ef4444' : segment.friction === 'medium' ? '#f59e0b' : '#10b981' }]} />
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Content */}
            <View style={[styles.info, isLast && styles.infoLast]}>
              <View style={styles.row}>
                <Text style={styles.instruction} numberOfLines={isExpanded ? undefined : 2}>
                  {segment.instruction}
                </Text>
                {showBadge && <FrictionBadge level={segment.friction} size="sm" />}
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.distance}>{segment.distance}</Text>
                <Icons.ChevronDown
                  size={14}
                  color="#94a3b8"
                  style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] } as any}
                />
              </View>

              {isExpanded && segment.details && (
                <View style={[styles.detailsBox, { backgroundColor: DETAILS_BG[segment.friction] ?? DETAILS_BG.low }]}>
                  <Icons.Info size={13} color="#64748b" />
                  <Text style={styles.detailsText}>{segment.details}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, gap: 0, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  segment: { flexDirection: 'row', gap: 14 },
  timeline: { alignItems: 'center', width: 12, paddingTop: 2 },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  line: {
    width: 2, flex: 1, minHeight: 24,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  info: { flex: 1, gap: 6, paddingBottom: 20 },
  infoLast: { paddingBottom: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  instruction: {
    flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a', lineHeight: 22,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distance: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  detailsBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 10, borderRadius: 10, marginTop: 4,
  },
  detailsText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
});
