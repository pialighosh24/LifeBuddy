import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isLoading } = useLanguage();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="language-select" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AccessibilityProvider>
      <LanguageProvider>
        <RootNavigator />
      </LanguageProvider>
    </AccessibilityProvider>
  );
}
