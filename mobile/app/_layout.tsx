import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { LanguageProvider, useLanguage } from '../src/i18n/LanguageContext';
import { AppButton } from '../src/components/AppButton';
import { StatusMessage } from '../src/components/StatusMessage';
import { colors } from '../src/theme';

function AuthGate() {
  const { isAuthenticated, isLoading, sessionStatus, sessionError, refreshSession, signOut } = useAuth();
  const { t } = useLanguage();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || sessionStatus === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (sessionStatus === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/caregiver-login');
    } else if (sessionStatus === 'authenticated' && inAuthGroup) {
      router.replace('/(app)/home');
    }
    // offline_unverified: do not redirect to login; keep token and show retry UI below
  }, [isAuthenticated, isLoading, sessionStatus, segments, router]);

  if (isLoading || sessionStatus === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24 }}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel={t('loadingSession')} />
        <Text style={{ marginTop: 12, color: colors.textMuted, fontSize: 16 }}>{t('loadingSession')}</Text>
      </View>
    );
  }

  if (sessionStatus === 'offline_unverified') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background, padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{t('connectionIssue')}</Text>
        <StatusMessage type="error" message={sessionError || t('networkError')} />
        <StatusMessage type="info" message={t('sessionKept')} />
        <AppButton label={t('retry')} onPress={refreshSession} accessibilityLabel={t('retry')} />
        <AppButton label={t('signOutLocal')} variant="outline" onPress={signOut} accessibilityLabel={t('signOutLocal')} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AuthGate />
      </LanguageProvider>
    </AuthProvider>
  );
}
