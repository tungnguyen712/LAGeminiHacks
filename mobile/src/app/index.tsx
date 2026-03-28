import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useProfile } from '../store/ProfileContext';
import { useLanguage, ACCENT_COLORS, THEME_MODES } from '../store/LanguageContext';
import { ACCESSIBILITY_PROFILES } from '../constants/profiles';
import type { AccessibilityProfile } from '../types/Profile';

const ProfileCard = ({
  profile, isSelected, accentColor, onSelect, th,
}: {
  profile: AccessibilityProfile;
  isSelected: boolean;
  accentColor: string;
  onSelect: () => void;
  th: typeof THEME_MODES['day'];
}) => {
  const [hovered, setHovered] = useState(false);
  const active = isSelected || hovered;

  return (
    <Pressable
      onPress={onSelect}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.card,
        { backgroundColor: th.surface, borderColor: th.border },
        active && { borderColor: accentColor, backgroundColor: `${accentColor}12` },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: profile.bgColor }]}>
        <Text style={styles.emoji}>{profile.emoji}</Text>
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { color: th.text }]}>{profile.name}</Text>
        <Text style={[styles.cardDesc, { color: th.textSecondary }]} numberOfLines={2}>{profile.description}</Text>
      </View>
      {isSelected
        ? <Icons.CheckCircle size={20} color={accentColor} />
        : <Icons.ChevronRight size={20} color={th.textMuted} />}
    </Pressable>
  );
};

export const OnboardingScreen = () => {
  const { selectedProfile, setSelectedProfile } = useProfile();
  const { t, accent, themeMode } = useLanguage();
  const th = THEME_MODES[themeMode];
  const navigate = useNavigate();
  const accentColor = ACCENT_COLORS[accent].primary;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View />
        <Pressable
          onPress={() => navigate('/settings')}
          style={({ pressed, hovered }: any) => [
            styles.settingsBtn,
            { backgroundColor: (pressed || hovered) ? th.surface : 'transparent' },
          ]}
        >
          <Icons.Settings size={20} color={th.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}30` }]}>
            <Icons.Navigation size={32} color={accentColor} />
          </View>
          <Text style={[styles.title, { color: th.text }]}>PathSense</Text>
          <Text style={[styles.subtitle, { color: th.textSecondary }]}>{t('tagline')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: th.textMuted }]}>{t('profile')}</Text>
          <View style={styles.cardList}>
            {ACCESSIBILITY_PROFILES.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isSelected={selectedProfile?.id === profile.id}
                accentColor={accentColor}
                onSelect={() => setSelectedProfile(profile)}
                th={th}
              />
            ))}
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }]}>
          <Icons.ShieldCheck size={18} color="#10b981" />
          <Text style={[styles.infoText, { color: th.isDark ? '#4ade80' : '#059669' }]}>
            Your profile stays on-device and is never shared.
          </Text>
        </View>

        <Pressable
          onPress={() => navigate('/search')}
          style={({ pressed, hovered }: any) => [
            styles.cta,
            { backgroundColor: accentColor },
            (pressed || hovered) && { opacity: 0.88, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Text style={styles.ctaText}>{t('getStarted')}</Text>
          <Icons.ArrowRight size={20} color="#fff" />
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' as any },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 48, gap: 28 },
  header: { alignItems: 'center', gap: 12, paddingTop: 12 },
  logoBox: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
  section: { gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  cardList: { gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderRadius: 16, borderWidth: 1, cursor: 'pointer' as any,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  cardText: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  cta: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' as any },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
