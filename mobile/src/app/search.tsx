import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useProfile } from '../store/ProfileContext';
import { useLanguage, THEME_MODES } from '../store/LanguageContext';
import { PlacesInput } from '../components/PlacesInput';
import { ProfileBadge } from '../components/profile/ProfileBadge';
import { VoiceSheet } from '../components/voice/VoiceSheet';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SearchScreen = () => {
  const { origin, setOrigin, destination, setDestination } = useRoute();
  const { selectedProfile } = useProfile();
  const { t, themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const [isVoiceVisible, setIsVoiceVisible] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const navigate = useNavigate();

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            setOrigin(results[0].formatted_address);
          } else {
            setOrigin(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
          setIsLocating(false);
        });
      },
      () => { setIsLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRecentSelect = (place: string) => {
    handleGPS();
    setDestination(place);
  };

  const handleSearch = () => {
    if (origin && destination) navigate('/results');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: th.border }]}>
        <Text style={[styles.title, { color: th.text }]}>Plan Route</Text>
        {selectedProfile && <ProfileBadge profile={selectedProfile} size="md" />}
        <TouchableOpacity onPress={() => navigate('/settings')} style={[styles.iconButton, { backgroundColor: th.surface }]}>
          <Icons.Settings size={20} color={th.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchSection}>
          <View style={styles.originRow}>
            <View style={{ flex: 1 }}>
              <PlacesInput
                value={origin}
                onPlaceSelect={setOrigin}
                placeholder={t('currentLocation')}
                icon="Circle"
                onVoicePress={() => setIsVoiceVisible(true)}
                th={th}
              />
            </View>
            <TouchableOpacity onPress={handleGPS} style={styles.gpsButton} disabled={isLocating}>
              {isLocating
                ? <ActivityIndicator size="small" color="#3b82f6" />
                : <Icons.LocateFixed size={20} color="#3b82f6" />
              }
            </TouchableOpacity>
          </View>
          <PlacesInput
            value={destination}
            onPlaceSelect={setDestination}
            placeholder={t('destination')}
            icon="MapPin"
            onVoicePress={() => setIsVoiceVisible(true)}
            th={th}
          />
        </View>

        <View style={styles.recentSection}>
          <Text style={[styles.sectionTitle, { color: th.textMuted }]}>Recent Places</Text>
          {[
            { name: 'Central Library', sub: '630 W 5th St, Downtown LA', place: 'Central Library, Los Angeles, CA' },
            { name: 'Griffith Park', sub: 'West Entrance, Accessible Path', place: 'Griffith Park, Los Angeles, CA' },
            { name: 'Union Station', sub: '800 N Alameda St, Los Angeles', place: 'Union Station, Los Angeles, CA' },
          ].map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[styles.recentItem, { borderBottomColor: th.border }]}
              onPress={() => handleRecentSelect(item.place)}
            >
              <Icons.Clock size={18} color={th.textMuted} />
              <View style={styles.recentText}>
                <Text style={[styles.recentTitle, { color: th.text }]}>{item.name}</Text>
                <Text style={[styles.recentSubtitle, { color: th.textSecondary }]}>{item.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: th.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            (!origin || !destination) && { backgroundColor: th.surface },
            pressed && !(!origin || !destination) && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleSearch}
          disabled={!origin || !destination}
        >
          <Text style={styles.buttonText}>{t('findRoutes')}</Text>
          <Icons.Search size={20} color="#ffffff" />
        </Pressable>
      </View>

      <VoiceSheet isVisible={isVoiceVisible} onClose={() => setIsVoiceVisible(false)} transcript="" isListening={false} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40,
    gap: 16, borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '800' },
  content: { flex: 1 },
  scrollContent: { padding: 20, gap: 32 },
  searchSection: { gap: 12 },
  originRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gpsButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(59,130,246,0.1)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
  },
  recentSection: { gap: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: 1 },
  recentText: { flex: 1, gap: 2 },
  recentTitle: { fontSize: 16, fontWeight: '600' },
  recentSubtitle: { fontSize: 13 },
  footer: { padding: 20, paddingBottom: 40, borderTopWidth: 1 },
  button: {
    backgroundColor: '#3b82f6', height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
