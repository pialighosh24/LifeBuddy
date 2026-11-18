import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LanguageItem } from '@/localization/languages';
import { TRANSLATIONS, TranslationMap } from '@/localization/translations';

interface LanguageContextType {
  currentLanguage: LanguageItem;
  setLanguage: (langId: string) => Promise<void>;
  t: (key: keyof TranslationMap, fallback?: string) => string;
  speak: (text: string, customCode?: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
  isSpeaking: boolean;
  isRTL: boolean;
  isLoading: boolean;
  hasSelectedLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LANGUAGE: '@udaya_language',
  HAS_SELECTED: '@udaya_has_selected_lang',
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageItem>(DEFAULT_LANGUAGE);
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedLangId, savedHasSelected] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
          AsyncStorage.getItem(STORAGE_KEYS.HAS_SELECTED),
        ]);

        if (savedLangId) {
          const match = SUPPORTED_LANGUAGES.find((l) => l.id === savedLangId);
          if (match) {
            setCurrentLanguage(match);
          }
        }
        if (savedHasSelected === 'true') {
          setHasSelectedLanguage(true);
        }
      } catch (e) {
        console.warn('Error reading language from AsyncStorage:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setLanguage = async (langId: string) => {
    const match = SUPPORTED_LANGUAGES.find((l) => l.id === langId) || DEFAULT_LANGUAGE;
    setCurrentLanguage(match);
    setHasSelectedLanguage(true);
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.LANGUAGE, langId],
        [STORAGE_KEYS.HAS_SELECTED, 'true'],
      ]);
    } catch (e) {
      console.warn('Failed to save language to AsyncStorage:', e);
    }
  };

  const t = (key: keyof TranslationMap, fallback?: string): string => {
    const langDict = TRANSLATIONS[currentLanguage.id];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const defaultDict = TRANSLATIONS.en;
    if (defaultDict && defaultDict[key]) {
      return defaultDict[key];
    }
    return fallback ?? key;
  };

  const speak = async (text: string, customCode?: string) => {
    try {
      // Stop any active speech
      await Speech.stop();
      setIsSpeaking(true);

      const targetLocale = customCode || currentLanguage.code || 'en-IN';

      Speech.speak(text, {
        language: targetLocale,
        rate: 0.9,
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: (err) => {
          console.warn('Speech error, retrying with fallback voice:', err);
          setIsSpeaking(false);
          // Graceful fallback to default English/Device voice if specific regional voice fails
          if (targetLocale !== 'en-US') {
            Speech.speak(text, {
              language: 'en-US',
              rate: 0.9,
              onDone: () => setIsSpeaking(false),
              onError: () => setIsSpeaking(false),
            });
          }
        },
      });
    } catch (e) {
      console.warn('Expo Speech error:', e);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = async () => {
    try {
      await Speech.stop();
    } catch (e) {
      console.warn('Speech stop error:', e);
    } finally {
      setIsSpeaking(false);
    }
  };

  const isRTL = Boolean(currentLanguage.isRTL);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        t,
        speak,
        stopSpeaking,
        isSpeaking,
        isRTL,
        isLoading,
        hasSelectedLanguage,
      }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
