'use client';

import * as React from 'react';

import {
  DEFAULT_LANGUAGE,
  languageHtmlLang,
  readStoredLanguage,
  writeStoredLanguage,
  type AppLanguage,
} from '@/lib/language';

export interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<AppLanguage>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const stored = readStoredLanguage();
    setLanguageState(stored);
    document.documentElement.lang = languageHtmlLang(stored);
    setMounted(true);
  }, []);

  const setLanguage = React.useCallback((next: AppLanguage) => {
    setLanguageState(next);
    writeStoredLanguage(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = languageHtmlLang(next);
    }
  }, []);

  const value = React.useMemo(
    () => ({
      language: mounted ? language : DEFAULT_LANGUAGE,
      setLanguage,
    }),
    [language, mounted, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
