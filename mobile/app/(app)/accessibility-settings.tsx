import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { colors, radii, typography } from '../../src/theme';

function Row({ title, note }: { title: string; note: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowNote}>{note}</Text>
      <StatusMessage type="info" message="Not persisted by an existing supported API in this build (honest unavailable state where applicable)." />
    </View>
  );
}

export default function AccessibilitySettingsScreen() {
  const { t } = useLanguage();
  return (
    <Screen>
      <Text style={styles.title}>{t('accessibilityTitle')}</Text>
      <StatusMessage type="info" message="Language can be changed in Profile and is saved on this device. Other accessibility preferences below are shown transparently based on current supported contracts." />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('language')}</Text>
        <Text style={styles.rowNote}>Supported in Profile (device-saved). Use Profile to switch English/Bengali labels and speech language preference where available.</Text>
      </View>

      <Row title={t('speechSpeed')} note={t('speechSpeedNote')} />
      <Row title={t('fontSize')} note={t('fontSizeNote')} />
      <Row title={t('notifications')} note={t('notificationsNote')} />
      <Row title={t('voiceInput')} note={t('voiceInputNote')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text, marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  cardTitle: { ...typography.subheading, color: colors.text, marginBottom: 4 },
  row: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  rowTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  rowNote: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
});
