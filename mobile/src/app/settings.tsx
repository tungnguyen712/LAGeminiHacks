import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import {
  useLanguage,
  ACCENT_COLORS,
  THEME_MODES,
  type ThemeAccent,
  type ThemeMode,
} from '../store/LanguageContext';

const LANGUAGES = [
  { code: 'en' as const, label: 'English', flag: '🇺🇸' },
  { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
  { code: 'ar' as const, label: 'العربية', flag: '🇸🇦' },
  { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
];

export const SettingsScreen = () => {
  const navigate = useNavigate();
  const { language, setLanguage, accent, setAccent, themeMode, setThemeMode, t } = useLanguage();
  const accentColor = ACCENT_COLORS[accent].primary;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate(-1)} style={styles.backBtn}>
          <Icons.ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Language */}
        <Section title={t('language')} icon={<Icons.Globe size={18} color={accentColor} />}>
          {LANGUAGES.map((lang) => (
            <LangRow
              key={lang.code}
              lang={lang}
              isSelected={language === lang.code}
              accentColor={accentColor}
              onPress={() => setLanguage(lang.code)}
            />
          ))}
        </Section>

        {/* Accent Color */}
        <Section title={t('accentColor')} icon={<Icons.Palette size={18} color={accentColor} />}>
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
                    selected && { borderWidth: 3, borderColor: '#fff' },
                  ]}
                >
                  {selected && <Icons.Check size={16} color="#fff" />}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.colorLabels}>
            {(Object.keys(ACCENT_COLORS) as ThemeAccent[]).map((key) => (
              <Text key={key} style={[styles.colorLabel, accent === key && { color: '#fff', fontWeight: '700' }]}>
                {ACCENT_COLORS[key].label}
              </Text>
            ))}
          </View>
        </Section>

        {/* Background */}
        <Section title={t('background')} icon={<Icons.Moon size={18} color={accentColor} />}>
          {(Object.keys(THEME_MODES) as ThemeMode[]).map((key) => {
            const m = THEME_MODES[key];
            const selected = themeMode === key;
            return (
              <Pressable
                key={key}
                onPress={() => setThemeMode(key)}
                style={({ pressed, hovered }: any) => [
                  styles.themeRow,
                  (hovered || pressed) && { backgroundColor: 'rgba(255,255,255,0.07)' },
                  selected && { borderColor: accentColor, borderWidth: 1 },
                ]}
              >
                <View style={[styles.themePreview, { backgroundColor: m.bg, borderColor: m.surface }]} />
                <Text style={[styles.themeLabel, selected && { color: '#fff' }]}>{m.label}</Text>
                {selected && <Icons.CheckCircle size={18} color={accentColor} />}
              </Pressable>
            );
          })}
        </Section>

      </ScrollView>
    </View>
  );
};

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const LangRow = ({
  lang, isSelected, accentColor, onPress,
}: {
  lang: { code: string; label: string; flag: string };
  isSelected: boolean;
  accentColor: string;
  onPress: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.langRow,
        (hovered || isSelected) && { backgroundColor: 'rgba(255,255,255,0.07)' },
        isSelected && { borderColor: accentColor, borderWidth: 1 },
      ]}
    >
      <Text style={styles.langFlag}>{lang.flag}</Text>
      <Text style={[styles.langLabel, isSelected && { color: '#fff', fontWeight: '700' }]}>{lang.label}</Text>
      {isSelected && <Icons.Check size={18} color={accentColor} />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  content: { padding: 20, gap: 28, paddingBottom: 60 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  sectionBody: { gap: 8, borderRadius: 16, overflow: 'hidden' },
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'transparent',
    cursor: 'pointer' as any,
  },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: 16, color: '#94a3b8', fontWeight: '500' },
  colorGrid: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  colorChip: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  colorLabels: { flexDirection: 'row', gap: 12 },
  colorLabel: { width: 48, fontSize: 10, color: '#64748b', textAlign: 'center' },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'transparent',
    cursor: 'pointer' as any,
  },
  themePreview: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 2,
  },
  themeLabel: { flex: 1, fontSize: 15, color: '#94a3b8', fontWeight: '500' },
});
