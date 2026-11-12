import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { translations, t as translate, type AppLanguage, type TranslationKey } from './translations';

const LANG_KEY = 'lifebuddy_language';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANG_KEY);
        if (saved === 'en' || saved === 'bn') setLanguageState(saved);
      } catch {
        // ignore, default en
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      await SecureStore.setItemAsync(LANG_KEY, lang);
    } catch {
      // keep in-memory preference even if persistence fails
    }
  }, []);

  const t = useCallback((key: TranslationKey, vars?: Record<string, string>) => translate(language, key, vars), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export { type AppLanguage, type TranslationKey };
