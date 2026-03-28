import { View, Text, StyleSheet } from 'react-native';

interface Props {
  confidence: number;
}

export function ConfidenceMeter({ confidence }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Confidence {pct}%</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6 },
  label: { color: '#8E8E93', fontSize: 11, marginBottom: 4 },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3C',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#8AB4F8',
  },
});
