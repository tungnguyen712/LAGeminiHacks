import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ConfidenceMeterProps {
  confidence: number; // 0-100
  size?: 'sm' | 'md';
}

export const ConfidenceMeter = ({ confidence, size = 'md' }: ConfidenceMeterProps) => {
  const color = confidence > 80 ? '#10b981' : confidence > 50 ? '#f59e0b' : '#ef4444';
  
  return (
    <View style={[styles.container, size === 'sm' ? styles.sm : styles.md]}>
      <View style={styles.barContainer}>
        <View 
          style={[
            styles.bar, 
            { width: `${confidence}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={[styles.text, { color }]}>{confidence}% Confidence</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sm: {
    gap: 4,
  },
  md: {
    gap: 8,
  },
  barContainer: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
