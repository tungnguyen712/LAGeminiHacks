import { View, Text, StyleSheet } from 'react-native';
import type { ProfileType } from '../../types/Profile';
import { PROFILES } from '../../constants/profiles';

interface Props {
  profile: ProfileType;
}

export function ProfileBadge({ profile }: Props) {
  const p = PROFILES.find((x) => x.type === profile);
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{p?.icon} {p?.label ?? profile}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#3A3A3C',
  },
  text: { color: '#E5E5EA', fontSize: 12, fontWeight: '600' },
});
