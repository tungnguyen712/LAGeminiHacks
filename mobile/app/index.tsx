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
import { useProfile } from '../store/ProfileContext';
import { useLanguage } from '../store/LanguageContext';
import { ACCESSIBILITY_PROFILES } from '../constants/profiles';
import { ProfileCard } from '../components/profile/ProfileCard';

export default function OnboardingScreen() {
  const { selectedProfile, setSelectedProfile } = useProfile();
  const { t, setLanguage, language } = useLanguage();
  const router = useRouter();

  const handleContinue = () => {
    router.push('/search');
  };

  const languages: { code: 'en' | 'fr' | 'ar' | 'es'; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'ar', label: 'AR' },
    { code: 'es', label: 'ES' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Language Switcher */}
      <View style={styles.langSwitcher}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            onPress={() => setLanguage(lang.code)}
            style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
          >
            <Text style={[styles.langText, language === lang.code && styles.langTextActive]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="navigate" size={32} color="#3b82f6" />
        </View>
        <Text style={styles.title}>PathSense</Text>
        <Text style={styles.subtitle}>{t('tagline')}</Text>
      </View>

      {/* Profile Selection */}
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>{t('profile')}</Text>
        <View style={styles.profileGrid}>
          {ACCESSIBILITY_PROFILES.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isSelected={selectedProfile?.id === profile.id}
              onSelect={() => setSelectedProfile(profile)}
            />
          ))}
        </View>
      </View>

      {/* Privacy Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="shield-checkmark" size={20} color="#10b981" />
        </View>
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>Privacy First</Text>
          <Text style={styles.infoDesc}>
            Your profile data stays on your device and is only used to calculate friction.
          </Text>
        </View>
      </View>

      {/* CTA */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        ]}
        onPress={handleContinue}
      >
        <Text style={styles.buttonText}>{t('getStarted')}</Text>
        <Ionicons name="arrow-forward" size={20} color="#ffffff" />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 24,
    gap: 32,
    paddingBottom: 40,
  },
  langSwitcher: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  langBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  langTextActive: {
    color: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
  profileSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ade80',
  },
  infoDesc: {
    fontSize: 13,
    color: '#4ade80',
    opacity: 0.8,
    lineHeight: 18,
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
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
