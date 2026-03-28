import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AccessibilityProfile } from '../../types/Profile';
import * as Icons from 'lucide-react';

interface ProfileBadgeProps {
  profile: AccessibilityProfile;
  size?: 'sm' | 'md';
}

export const ProfileBadge = ({ profile, size = 'md' }: ProfileBadgeProps) => {
  const IconComponent = (Icons as any)[profile.icon] || Icons.User;
  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <View style={[styles.container, size === 'sm' ? styles.sm : styles.md]}>
      <IconComponent size={iconSize} color="#94a3b8" />
      <Text style={[styles.text, size === 'sm' ? styles.smText : styles.mdText]}>
        {profile.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  smText: {
    fontSize: 10,
  },
  mdText: {
    fontSize: 12,
  },
});
