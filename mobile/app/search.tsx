import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '../store/RouteContext';
import { useProfile } from '../store/ProfileContext';
import { useLanguage } from '../store/LanguageContext';
import { SearchBar } from '../components/SearchBar';
import { ProfileBadge } from '../components/profile/ProfileBadge';
import { VoiceSheet } from '../components/voice/VoiceSheet';

export default function SearchScreen() {
  const { origin, setOrigin, destination, setDestination } = useRoute();
  const { selectedProfile } = useProfile();
  const { t } = useLanguage();
  const [isVoiceVisible, setIsVoiceVisible] = React.useState(false);
  const router = useRouter();

  const handleSearch = () => {
    if (origin && destination) {
      router.push('/results');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Plan Route</Text>
        {selectedProfile && <ProfileBadge profile={selectedProfile} size="sm" />}
      </View>

      {/* Scrollable content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchSection}>
          <View style={styles.searchGroup}>
            <View style={styles.line} />
            <View style={styles.inputWrapper}>
              <SearchBar
                value={origin}
                onChangeText={setOrigin}
                placeholder={t('currentLocation')}
                icon="Circle"
                onVoicePress={() => setIsVoiceVisible(true)}
              />
              <SearchBar
                value={destination}
                onChangeText={setDestination}
                placeholder={t('destination')}
                icon="MapPin"
                onVoicePress={() => setIsVoiceVisible(true)}
              />
            </View>
          </View>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Places</Text>
          <TouchableOpacity style={styles.recentItem}>
            <Ionicons name="time-outline" size={18} color="#94a3b8" />
            <View style={styles.recentText}>
              <Text style={styles.recentTitle}>Central Library</Text>
              <Text style={styles.recentSubtitle}>123 Main St, Downtown</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.recentItem}>
            <Ionicons name="time-outline" size={18} color="#94a3b8" />
            <View style={styles.recentText}>
              <Text style={styles.recentTitle}>Riverside Park</Text>
              <Text style={styles.recentSubtitle}>West Entrance, Accessible Path</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            (!origin || !destination) && styles.buttonDisabled,
            pressed && !(!origin || !destination) && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleSearch}
          disabled={!origin || !destination}
        >
          <Text style={styles.buttonText}>{t('findRoutes')}</Text>
          <Ionicons name="search" size={20} color="#ffffff" />
        </Pressable>
      </View>

      <VoiceSheet
        isVisible={isVoiceVisible}
        onClose={() => setIsVoiceVisible(false)}
        transcript=""
        isListening={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 32,
  },
  searchSection: {
    gap: 16,
  },
  searchGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  line: {
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 24,
    marginLeft: 22,
    borderRadius: 1,
  },
  inputWrapper: {
    flex: 1,
    gap: 12,
  },
  recentSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  recentText: {
    flex: 1,
    gap: 2,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  recentSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  button: {
    backgroundColor: '#3b82f6',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
