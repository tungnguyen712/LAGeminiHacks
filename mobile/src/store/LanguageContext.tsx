import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'fr' | 'ar' | 'es';

export type ThemeAccent = 'blue' | 'purple' | 'emerald' | 'orange';
export type ThemeMode = 'day' | 'dusk' | 'night';

export const ACCENT_COLORS: Record<ThemeAccent, { primary: string; glow: string; label: string }> = {
  blue:    { primary: '#3b82f6', glow: 'rgba(59,130,246,0.3)',  label: 'Ocean Blue' },
  purple:  { primary: '#a855f7', glow: 'rgba(168,85,247,0.3)',  label: 'Deep Purple' },
  emerald: { primary: '#10b981', glow: 'rgba(16,185,129,0.3)',  label: 'Emerald' },
  orange:  { primary: '#f97316', glow: 'rgba(249,115,22,0.3)',  label: 'Sunset' },
};

export const THEME_MODES: Record<ThemeMode, {
  bg: string;
  surface: string;
  label: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  headerBg: string;
  isDark: boolean;
}> = {
  day: {
    bg: '#f0f4f8',
    surface: 'rgba(0,0,0,0.05)',
    label: 'Day',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: 'rgba(0,0,0,0.09)',
    headerBg: 'rgba(240,244,248,0.97)',
    isDark: false,
  },
  dusk: {
    bg: '#fdf6ee',
    surface: 'rgba(0,0,0,0.05)',
    label: 'Dusk',
    text: '#1c1917',
    textSecondary: '#57534e',
    textMuted: '#a8a29e',
    border: 'rgba(0,0,0,0.08)',
    headerBg: 'rgba(253,246,238,0.97)',
    isDark: false,
  },
  night: {
    bg: '#0f172a',
    surface: 'rgba(255,255,255,0.04)',
    label: 'Night',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#475569',
    border: 'rgba(255,255,255,0.07)',
    headerBg: 'rgba(15,23,42,0.95)',
    isDark: true,
  },
};

const translations: Record<string, Record<Language, string>> = {
  welcome:          { en: 'Welcome to PathSense', fr: 'Bienvenue sur PathSense', ar: 'مرحباً في PathSense', es: 'Bienvenido a PathSense' },
  tagline:          { en: 'AI-Powered Accessible Navigation', fr: 'Navigation accessible propulsée par IA', ar: 'ملاحة ميسّرة بالذكاء الاصطناعي', es: 'Navegación accesible con IA' },
  getStarted:       { en: 'Get Started', fr: 'Commencer', ar: 'ابدأ الآن', es: 'Empezar' },
  searchPlaceholder:{ en: 'Where are you going?', fr: 'Où allez-vous ?', ar: 'إلى أين؟', es: '¿A dónde vas?' },
  currentLocation:  { en: 'Current Location', fr: 'Emplacement actuel', ar: 'موقعي الحالي', es: 'Mi ubicación' },
  destination:      { en: 'Destination', fr: 'Destination', ar: 'الوجهة', es: 'Destino' },
  findRoutes:       { en: 'Find Routes', fr: 'Trouver des itinéraires', ar: 'البحث عن طرق', es: 'Buscar rutas' },
  profile:          { en: 'Choose Your Profile', fr: 'Choisissez votre profil', ar: 'اختر ملفك الشخصي', es: 'Elige tu perfil' },
  settings:         { en: 'Settings', fr: 'Paramètres', ar: 'الإعدادات', es: 'Configuración' },
  language:         { en: 'Language', fr: 'Langue', ar: 'اللغة', es: 'Idioma' },
  appearance:       { en: 'Appearance', fr: 'Apparence', ar: 'المظهر', es: 'Apariencia' },
  accentColor:      { en: 'Accent Color', fr: 'Couleur d\'accent', ar: 'لون التمييز', es: 'Color de acento' },
  background:       { en: 'Background', fr: 'Arrière-plan', ar: 'الخلفية', es: 'Fondo' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  accent: ThemeAccent;
  setAccent: (a: ThemeAccent) => void;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [accent, setAccent] = useState<ThemeAccent>('blue');
  const [themeMode, setThemeMode] = useState<ThemeMode>('day');

  const t = (key: string) => translations[key]?.[language] ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, accent, setAccent, themeMode, setThemeMode, t }}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
