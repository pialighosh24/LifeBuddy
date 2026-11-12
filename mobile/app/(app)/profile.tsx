import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { colors, radii, typography } from '../../src/theme';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function LinkRow({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.9 }]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.linkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [langMsg, setLangMsg] = useState<string | null>(null);

  const onLogout = async () => {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async (lang: 'en' | 'bn') => {
    await setLanguage(lang);
    setLangMsg(t('savedLanguage'));
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('profileTitle')}</Text>

      {user ? (
        <View style={styles.card} accessibilityLabel="Authenticated user profile">
          <Row label={t('name')} value={user.displayName || user.fullName || '-'} />
          <Row label={t('role')} value={user.role} />
          <Row label={t('userId')} value={String(user.id)} />
          {user.email ? <Row label={t('email')} value={user.email} /> : null}
          <Row label={t('language')} value={user.preferredLanguage || '-'} />
        </View>
      ) : (
        <StatusMessage type="warning" message="No active session found." />
      )}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('language')}</Text>
        <Text style={styles.help}>Choose app language for labels and speech. This preference is saved on this device.</Text>
        <View style={styles.langRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: language === 'en' }}
            onPress={() => changeLanguage('en')}
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
          >
            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>{t('english')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: language === 'bn' }}
            onPress={() => changeLanguage('bn')}
            style={[styles.langBtn, language === 'bn' && styles.langBtnActive]}
          >
            <Text style={[styles.langText, language === 'bn' && styles.langTextActive]}>{t('bengali')}</Text>
          </Pressable>
        </View>
        {langMsg ? <StatusMessage type="success" message={langMsg} /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Help and Information</Text>
        <LinkRow label={t('accessibilitySettings')} icon="accessibility" onPress={() => router.push('/(app)/accessibility-settings')} />
        <LinkRow label={t('helpGuide')} icon="book" onPress={() => router.push('/(app)/help-guide')} />
        <LinkRow label={t('privacyInfo')} icon="shield-checkmark" onPress={() => router.push('/(app)/privacy')} />
        <LinkRow label={t('emergencyContactsNav')} icon="call" onPress={() => router.push('/(app)/emergency-contacts')} />
      </View>

      <StatusMessage type="info" message={t('logoutNote')} />
      <AppButton label={t('logout')} variant="danger" onPress={onLogout} loading={loading} disabled={loading} accessibilityLabel={t('logout')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  row: { marginBottom: 10 },
  label: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  value: { fontSize: 18, color: colors.text, fontWeight: '600' },
  sectionLabel: { ...typography.subheading, color: colors.text, marginBottom: 4 },
  help: { color: colors.textMuted, fontSize: 14, marginBottom: 10 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  langBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  langText: { fontWeight: '700', color: colors.text, fontSize: 16 },
  langTextActive: { color: colors.primaryDark },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  linkText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
});
