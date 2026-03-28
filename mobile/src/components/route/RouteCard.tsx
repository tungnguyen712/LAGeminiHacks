import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Route } from '../../types/Route';
import { FrictionBadge } from './FrictionBadge';
import * as Icons from 'lucide-react';

interface RouteCardProps {
  route: Route;
  isSelected: boolean;
  onSelect: () => void;
  onViewSegments?: () => void;
  key?: any;
}

export const RouteCard = ({ route, isSelected, onSelect, onViewSegments }: RouteCardProps) => {
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[styles.container, isSelected && styles.selected]}
      activeOpacity={0.85}
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

      <View style={[styles.footer, isSelected && styles.footerSelected]}>
        <TouchableOpacity
          style={styles.action}
          onPress={(e) => {
            e.stopPropagation?.();
            onViewSegments?.();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>View Segments</Text>
          <Icons.ChevronRight size={16} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    gap: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  selected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    gap: 4,
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
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
    color: '#64748b',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'flex-end',
  },
  footerSelected: {
    borderTopColor: '#dbeafe',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
