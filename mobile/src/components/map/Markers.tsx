import React from 'react';
import { View, StyleSheet } from 'react-native';
import * as Icons from 'lucide-react';

interface MarkerProps {
  type: 'origin' | 'destination' | 'friction';
  color?: string;
}

export const Markers = ({ type, color }: MarkerProps) => {
  if (type === 'origin') {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
        <View style={[styles.ring, { borderColor: '#3b82f6' }]} />
      </View>
    );
  }

  if (type === 'destination') {
    return (
      <View style={styles.container}>
        <Icons.MapPin size={24} color="#ef4444" fill="#ef444433" />
      </View>
    );
  }

  return (
    <View style={[styles.friction, { backgroundColor: color || '#f59e0b' }]}>
      <Icons.AlertTriangle size={12} color="#ffffff" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
  },
  ring: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    opacity: 0.3,
  },
  friction: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
