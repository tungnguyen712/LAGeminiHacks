import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View } from 'react-native';

type Language = 'en' | 'fr' | 'ar' | 'es';

interface Translation {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translation = {
  welcome: {
    en: 'Welcome to PathSense',
    fr: 'Bienvenue sur PathSense',
    ar: 'مرحباً بك في PathSense',
    es: 'Bienvenido a PathSense',
  },
  tagline: {
    en: 'AI-Powered Accessible Navigation',
    fr: "Navigation accessible propulsée par l'IA",
    ar: 'ملاحة ميسرة مدعومة بالذكاء الاصطناعي',
    es: 'Navegación accesible potenciada por IA',
  },
  getStarted: {
    en: 'Get Started',
    fr: 'Commencer',
    ar: 'ابدأ الآن',
    es: 'Empezar',
  },
  searchPlaceholder: {
    en: 'Where are you going?',
    fr: 'Où allez-vous ?',
    ar: 'إلى أين أنت ذاهب؟',
    es: '¿A dónde vas?',
  },
  currentLocation: {
    en: 'Current Location',
    fr: 'Emplacement actuel',
    ar: 'الموقع الحالي',
    es: 'Ubicación actual',
  },
  destination: {
    en: 'Destination',
    fr: 'Destination',
    ar: 'الوجهة',
    es: 'Destino',
  },
  findRoutes: {
    en: 'Find Routes',
    fr: 'Trouver des itinéraires',
    ar: 'البحث عن طرق',
    es: 'Buscar rutas',
  },
  analyzing: {
    en: 'Analyzing friction...',
    fr: 'Analyse de la friction...',
    ar: 'تحليل الاحتكاك...',
    es: 'Analizando fricción...',
  },
  navigate: {
    en: 'Navigate',
    fr: 'Naviguer',
    ar: 'التنقل',
    es: 'Navegar',
  },
  profile: {
    en: 'Profile',
    fr: 'Profil',
    ar: 'الملف الشخصي',
    es: 'Perfil',
  },
  settings: {
    en: 'Settings',
    fr: 'Paramètres',
    ar: 'الإعدادات',
    es: 'Configuración',
  },
  language: {
    en: 'Language',
    fr: 'Langue',
    ar: 'اللغة',
    es: 'Idioma',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <View style={{ flex: 1 }}>{children}</View>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
