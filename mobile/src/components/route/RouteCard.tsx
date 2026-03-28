import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Route } from '../../types/Route';
import { FrictionBadge } from './FrictionBadge';
import { ConfidenceMeter } from './ConfidenceMeter';
import * as Icons from 'lucide-react';

interface RouteCardProps {
  route: Route;
  isSelected: boolean;
  onSelect: () => void;
  key?: any;
}

export const RouteCard = ({ route, isSelected, onSelect }: RouteCardProps) => {
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[styles.container, isSelected && styles.selected]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.name}>{route.name}</Text>
          <View style={styles.meta}>
            <Text style={styles.time}>{route.estimatedTime}</Text>
            <View style={styles.dot} />
            <Text style={styles.distance}>{route.totalDistance}</Text>
          </View>
        </View>
        <FrictionBadge level={route.overallFriction} />
      </View>
      
      <View style={styles.footer}>
        <ConfidenceMeter confidence={route.confidence} />
        <View style={styles.action}>
          <Text style={styles.actionText}>View Segments</Text>
          <Icons.ChevronRight size={16} color="#3b82f6" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  selected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  distance: {
    fontSize: 14,
    color: '#94a3b8',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
