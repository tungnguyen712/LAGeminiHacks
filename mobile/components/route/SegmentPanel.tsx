import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { Segment } from '../../types/Route';
import { FrictionBadge } from './FrictionBadge';
import { ConfidenceMeter } from './ConfidenceMeter';

interface Props {
  segment: Segment;
}

export function SegmentPanel({ segment }: Props) {
  const f = segment.friction;
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title}>{segment.description}</Text>
      {f && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Friction</Text>
            <FrictionBadge level={f.level} />
          </View>
          <ConfidenceMeter confidence={f.confidence} />
          <Text style={styles.section}>Why this segment</Text>
          {(f.reasons ?? []).map((r, i) => (
            <Text key={i} style={styles.bullet}>
              • {r}
            </Text>
          ))}
          <Text style={styles.section}>Recommendation</Text>
          <Text style={styles.bodyText}>{f.recommendation}</Text>
        </>
      )}
      {!f && (
        <Text style={styles.muted}>Friction scoring unavailable offline.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 32 },
  title: { color: '#F2F2F7', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: { color: '#AEAEB2', fontSize: 14 },
  section: {
    color: '#8AB4F8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  bullet: { color: '#E5E5EA', fontSize: 14, marginBottom: 4 },
  bodyText: { color: '#E5E5EA', fontSize: 15, lineHeight: 22 },
  muted: { color: '#8E8E93', fontSize: 14 },
});
