import React, { createContext, useContext, useEffect, useState } from 'react';
import * as ExpoLocalization from 'expo-localization';
import type { LocaleInfo } from '../types/Locale';
import { resolveLanguage } from '../constants/supportedLanguages';

const defaultLocale: LocaleInfo = {
  languageCode: 'en',
  languageTag: 'en-US',
  isRTL: false,
};

const LocaleContext = createContext<LocaleInfo>(defaultLocale);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<LocaleInfo>(defaultLocale);

  useEffect(() => {
    const deviceTag = ExpoLocalization.getLocales()?.[0]?.languageTag ?? 'en-US';
    const resolved = resolveLanguage(deviceTag);
    setLocale({
      languageCode: resolved.code,
      languageTag: resolved.tag,
      isRTL: ExpoLocalization.isRTL,
    });
  }, []);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext() {
  return useContext(LocaleContext);
}
