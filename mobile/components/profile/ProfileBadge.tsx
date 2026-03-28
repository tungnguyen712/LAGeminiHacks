import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibilityProfile } from '../../types/Profile';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface ProfileBadgeProps {
  profile: AccessibilityProfile;
  size?: 'sm' | 'md';
}

const profileIconMap: Record<string, IoniconName> = {
  accessibility: 'accessibility',
  eye: 'eye-outline',
  baby: 'people-outline',
};

export const ProfileBadge = ({ profile, size = 'md' }: ProfileBadgeProps) => {
  const iconName: IoniconName = profileIconMap[profile.icon] ?? 'person-outline';
  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <View style={[styles.container, size === 'sm' ? styles.sm : styles.md]}>
      <Ionicons name={iconName} size={iconSize} color="#94a3b8" />
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
