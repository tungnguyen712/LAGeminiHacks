import { View, Text, StyleSheet } from 'react-native';
import type { FrictionLevel } from '../../types/Route';
import { FRICTION_COLORS } from '../../constants/frictionColors';

interface Props {
  level: FrictionLevel;
}

export function FrictionBadge({ level }: Props) {
  const bg = FRICTION_COLORS[level];
  return (
    <View style={[styles.badge, { backgroundColor: bg + '33', borderColor: bg }]}>
      <Text style={[styles.text, { color: bg }]}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: { fontSize: 11, fontWeight: '700' },
});
