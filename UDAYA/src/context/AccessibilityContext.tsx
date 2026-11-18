import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Colors, ThemeType, AppTheme } from '@/constants/theme';

interface AccessibilityContextType {
  themeMode: 'light' | 'dark' | 'highContrast' | 'system';
  isHighContrast: boolean;
  activeThemeName: ThemeType;
  theme: AppTheme;
  fontScale: number; // 1.0, 1.15, 1.3
  hapticsEnabled: boolean;
  speechGuidanceEnabled: boolean;
  toggleHighContrast: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'highContrast' | 'system') => void;
  setFontScale: (scale: number) => void;
  toggleHaptics: () => void;
  toggleSpeechGuidance: () => void;
  triggerHaptic: (type?: 'selection' | 'success' | 'warning' | 'error' | 'heavy') => Promise<void>;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEYS = {
  THEME_MODE: '@udaya_theme_mode',
  FONT_SCALE: '@udaya_font_scale',
  HAPTICS: '@udaya_haptics',
  SPEECH_GUIDANCE: '@udaya_speech_guidance',
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useNativeColorScheme();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'highContrast' | 'system'>('system');
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [fontScale, setFontScaleState] = useState<number>(1.0);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [speechGuidanceEnabled, setSpeechGuidanceEnabled] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedFontScale, savedHaptics, savedSpeech] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE),
          AsyncStorage.getItem(STORAGE_KEYS.FONT_SCALE),
          AsyncStorage.getItem(STORAGE_KEYS.HAPTICS),
          AsyncStorage.getItem(STORAGE_KEYS.SPEECH_GUIDANCE),
        ]);

        if (savedTheme) {
          const parsed = savedTheme as 'light' | 'dark' | 'highContrast' | 'system';
          setThemeModeState(parsed);
          setIsHighContrast(parsed === 'highContrast');
        }
        if (savedFontScale) {
          setFontScaleState(parseFloat(savedFontScale) || 1.0);
        }
        if (savedHaptics !== null) {
          setHapticsEnabled(savedHaptics === 'true');
        }
        if (savedSpeech !== null) {
          setSpeechGuidanceEnabled(savedSpeech === 'true');
        }
      } catch (err) {
        console.warn('Failed to load accessibility settings from AsyncStorage:', err);
      }
    })();
  }, []);

  const setThemeMode = async (mode: 'light' | 'dark' | 'highContrast' | 'system') => {
    setThemeModeState(mode);
    setIsHighContrast(mode === 'highContrast');
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
    } catch (e) {
      console.warn('Failed to save theme mode:', e);
    }
  };

  const toggleHighContrast = async () => {
    const next = !isHighContrast;
    setIsHighContrast(next);
    const newMode = next ? 'highContrast' : (systemScheme === 'dark' ? 'dark' : 'light');
    setThemeModeState(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, newMode);
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to toggle high contrast:', e);
    }
  };

  const setFontScale = async (scale: number) => {
    setFontScaleState(scale);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SCALE, scale.toString());
    } catch (e) {
      console.warn('Failed to save font scale:', e);
    }
  };

  const toggleHaptics = async () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAPTICS, next ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save haptics:', e);
    }
  };

  const toggleSpeechGuidance = async () => {
    const next = !speechGuidanceEnabled;
    setSpeechGuidanceEnabled(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SPEECH_GUIDANCE, next ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save speech guidance:', e);
    }
  };

  const triggerHaptic = async (type: 'selection' | 'success' | 'warning' | 'error' | 'heavy' = 'selection') => {
    if (!hapticsEnabled) return;
    try {
      switch (type) {
        case 'selection':
          await Haptics.selectionAsync();
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch {
      // Haptics may be unsupported on web or simulators; fail silently
    }
  };

  // Determine active theme
  let activeThemeName: ThemeType = 'light';
  if (isHighContrast || themeMode === 'highContrast') {
    activeThemeName = 'highContrast';
  } else if (themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark')) {
    activeThemeName = 'dark';
  } else {
    activeThemeName = 'light';
  }

  const theme: AppTheme = Colors[activeThemeName] as unknown as AppTheme;

  return (
    <AccessibilityContext.Provider
      value={{
        themeMode,
        isHighContrast,
        activeThemeName,
        theme,
        fontScale,
        hapticsEnabled,
        speechGuidanceEnabled,
        toggleHighContrast,
        setThemeMode,
        setFontScale,
        toggleHaptics,
        toggleSpeechGuidance,
        triggerHaptic,
      }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
