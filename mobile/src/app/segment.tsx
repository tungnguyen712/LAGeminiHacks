import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useProfile } from '../store/ProfileContext';
import { useLanguage, THEME_MODES } from '../store/LanguageContext';
import { SegmentPanel } from '../components/route/SegmentPanel';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SegmentScreen = () => {
  const { activeRoute } = useRoute();
  const { selectedProfile } = useProfile();
  const { themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeRoute) navigate('/results');
  }, []);

  if (!activeRoute) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: th.headerBg, borderBottomColor: th.border }]}>
        <TouchableOpacity
          onPress={() => navigate('/results')}
          style={[styles.backButton, { backgroundColor: th.surface }]}
        >
          <Icons.ArrowLeft size={24} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: th.text }]}>Route Details</Text>
          <Text style={[styles.subtitle, { color: th.textSecondary }]}>
            {activeRoute.name} • {activeRoute.totalDistance}
          </Text>
        </View>
        {selectedProfile && (
          <View style={[styles.profileChip, { backgroundColor: th.surface }]}>
            <Text style={styles.profileEmoji}>{selectedProfile.emoji}</Text>
          </View>
        )}
      </View>

      <SegmentPanel segments={activeRoute.segments} />

      <View style={[styles.footer, { backgroundColor: th.headerBg, borderTopColor: th.border }]}>
        <TouchableOpacity style={styles.button} onPress={() => navigate('/navigate')}>
          <Text style={styles.buttonText}>Start Navigation</Text>
          <Icons.Navigation2 size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40,
    gap: 12, borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 14, fontWeight: '500' },
  profileChip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  profileEmoji: { fontSize: 20 },
  footer: { padding: 20, paddingBottom: 40, borderTopWidth: 1 },
  button: {
    backgroundColor: '#3b82f6', height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
