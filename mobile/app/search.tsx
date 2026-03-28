import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SearchBar } from '../components/SearchBar';
import { useProfileContext } from '../store/ProfileContext';
import { useLocaleContext } from '../store/LocaleContext';
import { useRoutes } from '../hooks/useRoutes';

export default function SearchScreen() {
  const { profile } = useProfileContext();
  const { languageCode } = useLocaleContext();
  const { fetchRoutes, loading } = useRoutes();

  useEffect(() => {
    if (!profile) router.replace('/');
  }, [profile]);

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan your walk</Text>
      <Text style={styles.hint}>Demo zone: UCLA campus. Try preset addresses or your own.</Text>
      <SearchBar
        loading={loading}
        onSearch={async (origin, destination) => {
          await fetchRoutes(origin, destination, profile, languageCode);
          router.push('/results');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 16 },
  title: { color: '#F2F2F7', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  hint: { color: '#8E8E93', fontSize: 14, marginBottom: 16, lineHeight: 20 },
});
