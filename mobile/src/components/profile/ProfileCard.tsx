import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AccessibilityProfile } from '../../types/Profile';
import * as Icons from 'lucide-react';

interface ProfileCardProps {
  profile: AccessibilityProfile;
  isSelected: boolean;
  onSelect: () => void;
  key?: any;
}

export const ProfileCard = ({ profile, isSelected, onSelect }: ProfileCardProps) => {
  const IconComponent = (Icons as any)[profile.icon] || Icons.User;

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.7}
      style={[styles.container, isSelected && styles.selected]}
    >
      <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
        <IconComponent size={24} color={isSelected ? '#ffffff' : '#94a3b8'} />
      </View>
      <Text style={[styles.name, isSelected && styles.selectedName]}>
        {profile.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 120,
    gap: 12,
  },
  selected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIconContainer: {
    backgroundColor: '#3b82f6',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  selectedName: {
    color: '#ffffff',
  },
});
