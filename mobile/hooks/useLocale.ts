import { useLocaleContext } from '../store/LocaleContext';

export function useLocale() {
  return useLocaleContext();
}
