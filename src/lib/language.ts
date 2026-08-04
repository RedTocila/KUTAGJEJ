export const LANGUAGE_STORAGE_KEY = 'kutagjej-language';

export type AppLanguage = 'sq' | 'en';

export const DEFAULT_LANGUAGE: AppLanguage = 'sq';

export function parseLanguage(value: string | undefined | null): AppLanguage {
  if (value === 'en') return 'en';
  if (value === 'sq') return 'sq';
  return DEFAULT_LANGUAGE;
}

export function languageHtmlLang(language: AppLanguage): string {
  return language === 'en' ? 'en' : 'sq-AL';
}

export function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    return parseLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function writeStoredLanguage(language: AppLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // ignore quota / private mode
  }
}
