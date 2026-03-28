import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Route } from '../../types/Route';
import { FrictionBadge } from './FrictionBadge';
import { ConfidenceMeter } from './ConfidenceMeter';

interface Props {
  route: Route;
  onSelect: (id: string) => void;
  onSegmentPress: (segmentId: string) => void;
}

export function RouteCard({ route, onSelect, onSegmentPress }: Props) {
  const minutes = Math.round(route.durationSeconds / 60);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSelect(route.id)}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <Text style={styles.title}>{route.label.replace(/-/g, ' ')}</Text>
        <FrictionBadge level={route.overallFriction} />
      </View>
      <Text style={styles.meta}>
        {minutes} min · {(route.distanceMeters / 1000).toFixed(1)} km
      </Text>
      {route.segments.map((seg) => (
        <TouchableOpacity
          key={seg.id}
          style={styles.segmentRow}
          onPress={() => onSegmentPress(seg.id)}
        >
          <View style={styles.segmentText}>
            <Text style={styles.segmentDesc} numberOfLines={2}>
              {seg.description}
            </Text>
            {seg.friction && (
              <ConfidenceMeter confidence={seg.friction.confidence} />
            )}
          </View>
          {seg.friction && <FrictionBadge level={seg.friction.level} />}
        </TouchableOpacity>
      ))}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: '#F2F2F7',
    fontSize: 17,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  meta: { color: '#AEAEB2', fontSize: 13, marginBottom: 10 },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3A3A3C',
    gap: 8,
  },
  segmentText: { flex: 1 },
  segmentDesc: { color: '#E5E5EA', fontSize: 14 },
});
