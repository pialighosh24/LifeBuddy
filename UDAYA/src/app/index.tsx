import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import { UdayaLogo } from '@/components/UdayaLogo';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoading, hasSelectedLanguage } = useLanguage();
  const { theme, isHighContrast } = useAccessibility();

  useEffect(() => {
    if (!isLoading) {
      if (!hasSelectedLanguage) {
        // First-time launch: Welcome Screen -> Language Selection Page -> Home Dashboard
        router.replace('/welcome' as any);
      } else {
        // Returning user: Direct to Home Dashboard
        router.replace('/(tabs)' as any);
      }
    }
  }, [isLoading, hasSelectedLanguage, router]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isHighContrast ? '#000000' : theme.background },
      ]}>
      <UdayaLogo size="large" showTagline />
      <ActivityIndicator
        size="large"
        color={isHighContrast ? '#FFE600' : theme.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  spinner: {
    marginTop: 28,
  },
});
