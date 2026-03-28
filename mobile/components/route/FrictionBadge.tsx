import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FrictionLevel } from '../../types/Route';
import { FRICTION_COLORS } from '../../constants/frictionColors';

interface FrictionBadgeProps {
  level: FrictionLevel;
  size?: 'sm' | 'md';
}

export const FrictionBadge = ({ level, size = 'md' }: FrictionBadgeProps) => {
  const color = FRICTION_COLORS[level];
  const label = level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: color + '26', borderColor: color + '4D' },
        size === 'sm' ? styles.sm : styles.md,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, size === 'sm' ? styles.smText : styles.mdText]}>
        {label} Friction
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    gap: 6,
    borderWidth: 1,
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  smText: {
    fontSize: 8,
  },
  mdText: {
    fontSize: 10,
  },
});
