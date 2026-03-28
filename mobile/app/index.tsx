import { Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ProfileCard } from '../components/profile/ProfileCard';
import { PROFILES } from '../constants/profiles';
import { useProfileContext } from '../store/ProfileContext';

export default function ProfileSelectScreen() {
  const { setProfile } = useProfileContext();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>PathSense</Text>
      <Text style={styles.subtitle}>Accessibility-aware routes with Gemini</Text>
      <Text style={styles.section}>Who is navigating?</Text>
      {PROFILES.map((p) => (
        <ProfileCard
          key={p.type}
          profile={p}
          onSelect={async (type) => {
            await setProfile(type);
            router.push('/search');
          }}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 24 },
  title: { color: '#F2F2F7', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#8E8E93', fontSize: 15, marginTop: 6, marginBottom: 20 },
  section: { color: '#AEAEB2', fontSize: 14, marginBottom: 10, fontWeight: '600' },
});
