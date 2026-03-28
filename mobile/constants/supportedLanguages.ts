export interface SupportedLanguage {
  tag: string;   // BCP-47
  code: string;  // ISO 639-1
  label: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { tag: 'en-US', code: 'en', label: 'English' },
  { tag: 'es-ES', code: 'es', label: 'Español' },
  { tag: 'fr-FR', code: 'fr', label: 'Français' },
];

export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0];

export function resolveLanguage(deviceTag: string): SupportedLanguage {
  const match = SUPPORTED_LANGUAGES.find(
    (l) => deviceTag.startsWith(l.code)
  );
  return match ?? DEFAULT_LANGUAGE;
}
