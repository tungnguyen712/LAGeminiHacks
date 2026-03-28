import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { UserProfile, ProfileType } from '../../types/Profile';

interface Props {
  profile: UserProfile;
  onSelect: (type: ProfileType) => void;
}

export function ProfileCard({ profile, onSelect }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSelect(profile.type)}
      activeOpacity={0.85}
    >
      <Text style={styles.icon}>{profile.icon}</Text>
      <View style={styles.textCol}>
        <Text style={styles.title}>{profile.label}</Text>
        <Text style={styles.desc}>{profile.description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    gap: 14,
  },
  icon: { fontSize: 28 },
  textCol: { flex: 1 },
  title: { color: '#F2F2F7', fontSize: 17, fontWeight: '600' },
  desc: { color: '#AEAEB2', fontSize: 14, marginTop: 4 },
});
