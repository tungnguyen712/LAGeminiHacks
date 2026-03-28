import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useLanguage, ACCENT_COLORS, THEME_MODES, type ThemeAccent, type ThemeMode } from '../store/LanguageContext';

const LANGUAGES = [
  { code: 'en' as const, label: 'English', flag: '🇺🇸' },
  { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
  { code: 'ar' as const, label: 'العربية', flag: '🇸🇦' },
  { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
];

export const SettingsScreen = () => {
  const navigate = useNavigate();
  const { language, setLanguage, accent, setAccent, themeMode, setThemeMode, t } = useLanguage();
  const th = THEME_MODES[themeMode];
  const accentColor = ACCENT_COLORS[accent].primary;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: th.border }]}>
        <TouchableOpacity onPress={() => navigate(-1 as any)} style={[styles.backBtn, { backgroundColor: th.surface }]}>
          <Icons.ArrowLeft size={22} color={th.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: th.text }]}>{t('settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Pressable
          onPress={() => { localStorage.removeItem('pathsense_profile'); navigate('/onboarding'); }}
          style={({ pressed }) => [
            styles.switchProfile,
            { backgroundColor: th.surface, borderColor: th.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Icons.UserCog size={20} color={accentColor} />
          <Text style={[styles.switchProfileText, { color: th.text }]}>Switch Profile</Text>
          <Icons.ChevronRight size={18} color={th.textMuted} />
        </Pressable>

        <Section title={t('language')} icon={<Icons.Globe size={18} color={accentColor} />} th={th}>
          {LANGUAGES.map((lang) => (
            <LangRow
              key={lang.code}
              lang={lang}
              isSelected={language === lang.code}
              accentColor={accentColor}
              onPress={() => setLanguage(lang.code)}
              th={th}
            />
          ))}
        </Section>

        <Section title={t('accentColor')} icon={<Icons.Palette size={18} color={accentColor} />} th={th}>
          <View style={styles.colorGrid}>
            {(Object.keys(ACCENT_COLORS) as ThemeAccent[]).map((key) => {
              const c = ACCENT_COLORS[key];
              const selected = accent === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setAccent(key)}
                  style={({ pressed }) => [
                    styles.colorChip,
                    { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 },
                    selected && { borderWidth: 3, borderColor: th.isDark ? '#fff' : '#0f172a' },
                  ]}
                >
                  {selected && <Icons.Check size={16} color="#fff" />}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.colorLabels}>
            {(Object.keys(ACCENT_COLORS) as ThemeAccent[]).map((key) => (
              <Text key={key} style={[styles.colorLabel, { color: th.textMuted }, accent === key && { color: th.text, fontWeight: '700' }]}>
                {ACCENT_COLORS[key].label}
              </Text>
            ))}
          </View>
        </Section>

        <Section title={t('background')} icon={<Icons.Sun size={18} color={accentColor} />} th={th}>
          {(Object.keys(THEME_MODES) as ThemeMode[]).map((key) => {
            const m = THEME_MODES[key];
            const selected = themeMode === key;
            return (
              <Pressable
                key={key}
                onPress={() => setThemeMode(key)}
                style={({ pressed, hovered }: any) => [
                  styles.themeRow,
                  { backgroundColor: th.surface, borderColor: 'transparent' },
                  (hovered || pressed) && { backgroundColor: th.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                  selected && { borderColor: accentColor, borderWidth: 1 },
                ]}
              >
                <View style={[styles.themePreview, { backgroundColor: m.bg, borderColor: m.border }]} />
                <Text style={[styles.themeLabel, { color: th.textSecondary }, selected && { color: th.text, fontWeight: '700' }]}>
                  {m.label}
                </Text>
                {selected && <Icons.CheckCircle size={18} color={accentColor} />}
              </Pressable>
            );
          })}
        </Section>

      </ScrollView>
    </View>
  );
};

const Section = ({ title, icon, children, th }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  th: typeof THEME_MODES['day'];
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={[styles.sectionTitle, { color: th.textMuted }]}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const LangRow = ({ lang, isSelected, accentColor, onPress, th }: {
  lang: { code: string; label: string; flag: string };
  isSelected: boolean; accentColor: string; onPress: () => void;
  th: typeof THEME_MODES['day'];
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.langRow,
        { backgroundColor: th.surface, borderColor: 'transparent' },
        (hovered || isSelected) && { backgroundColor: th.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
        isSelected && { borderColor: accentColor, borderWidth: 1 },
      ]}
    >
      <Text style={styles.langFlag}>{lang.flag}</Text>
      <Text style={[styles.langLabel, { color: th.textSecondary }, isSelected && { color: th.text, fontWeight: '700' }]}>
        {lang.label}
      </Text>
      {isSelected && <Icons.Check size={18} color={accentColor} />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { padding: 20, gap: 28, paddingBottom: 60 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  sectionBody: { gap: 8, borderRadius: 16, overflow: 'hidden' },
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14, borderWidth: 1, cursor: 'pointer' as any,
  },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  colorGrid: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  colorChip: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' as any },
  colorLabels: { flexDirection: 'row', gap: 12 },
  colorLabel: { width: 48, fontSize: 10, textAlign: 'center' },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14, borderWidth: 1, cursor: 'pointer' as any,
  },
  themePreview: { width: 36, height: 36, borderRadius: 10, borderWidth: 2 },
  themeLabel: { flex: 1, fontSize: 15 },
  switchProfile: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1, cursor: 'pointer' as any,
  },
  switchProfileText: { flex: 1, fontSize: 16, fontWeight: '600' },
});
