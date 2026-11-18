import { Platform } from 'react-native';

export const Colors = {
  light: {
    name: 'light',
    background: '#F8FAFC',
    backgroundElement: '#EEF2F6',
    backgroundSelected: '#E0E7FF',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardHover: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    primary: '#0D9488', // Dawn Teal
    primaryHover: '#0F766E',
    primarySurface: '#F0FDFA',
    primaryText: '#FFFFFF',
    accent: '#F59E0B', // Sunrise Amber
    accentSurface: '#FEF3C7',
    sos: '#DC2626',
    sosSurface: '#FEE2E2',
    sosBorder: '#EF4444',
    
    // Feature Colors
    featureComm: '#7C3AED',
    featureCommSurface: '#F5F3FF',
    featureVision: '#0284C7',
    featureVisionSurface: '#F0F9FF',
    featureHearing: '#059669',
    featureHearingSurface: '#ECFDF5',
    featureRoutine: '#D97706',
    featureRoutineSurface: '#FFFBEB',
    
    // Utilities
    border: '#CBD5E1',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    shadow: 'rgba(15, 23, 42, 0.08)',
  },
  
  dark: {
    name: 'dark',
    background: '#090D16',
    backgroundElement: '#141C2E',
    backgroundSelected: '#1E293B',
    card: '#111827',
    cardBorder: '#1F2937',
    cardHover: '#1F293D',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    primary: '#14B8A6',
    primaryHover: '#0D9488',
    primarySurface: '#132E2E',
    primaryText: '#042F2E',
    accent: '#FBBF24',
    accentSurface: '#332612',
    sos: '#EF4444',
    sosSurface: '#3B1212',
    sosBorder: '#DC2626',
    
    // Feature Colors
    featureComm: '#A78BFA',
    featureCommSurface: '#241442',
    featureVision: '#38BDF8',
    featureVisionSurface: '#082F49',
    featureHearing: '#34D399',
    featureHearingSurface: '#064E3B',
    featureRoutine: '#FBBF24',
    featureRoutineSurface: '#3B2909',
    
    // Utilities
    border: '#334155',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
  
  highContrast: {
    name: 'highContrast',
    background: '#000000',
    backgroundElement: '#121212',
    backgroundSelected: '#262626',
    card: '#000000',
    cardBorder: '#FFFFFF',
    cardHover: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#FFE600', // High-vis yellow
    textMuted: '#00FFFF', // High-vis cyan
    primary: '#FFE600',
    primaryHover: '#FFF066',
    primarySurface: '#000000',
    primaryText: '#000000',
    accent: '#00FFFF',
    accentSurface: '#000000',
    sos: '#FF3333',
    sosSurface: '#000000',
    sosBorder: '#FF3333',
    
    // High-contrast Feature Accents
    featureComm: '#D8B4FE',
    featureCommSurface: '#000000',
    featureVision: '#38BDF8',
    featureVisionSurface: '#000000',
    featureHearing: '#34D399',
    featureHearingSurface: '#000000',
    featureRoutine: '#FBBF24',
    featureRoutineSurface: '#000000',
    
    border: '#FFFFFF',
    success: '#39FF14',
    warning: '#FFE600',
    error: '#FF3333',
    shadow: 'transparent',
  },
} as const;

export type ThemeType = 'light' | 'dark' | 'highContrast';
export type AppTheme = typeof Colors.light;
export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, serif',
    rounded: 'ui-rounded, "SF Pro Rounded", sans-serif',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
  ten: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const MinTouchTarget = 48; // Accessible tap area minimum (WCAG 2.1 AAA standard)
export const MaxContentWidth = 840;
export const BottomTabInset = Platform.select({ ios: 40, android: 60 }) ?? 40;
