import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { colors, radii, typography } from '../../src/theme';

export default function PrivacyScreen() {
  const { t } = useLanguage();
  const points = [
    'Account and care data are accessed through the configured Life Buddy backend and database.',
    'Passwords, PINs, and authentication tokens are not displayed in the app.',
    'SOS events are recorded in the system when created; external SMS/call/push/emergency-service delivery is not claimed unless verified.',
    'Medicine reminders shown in the app are schedule information from backend records, not proof of notification delivery.',
    'Only supported features and real data are shown; unavailable features display honest messages.',
  ];
  return (
    <Screen>
      <Text style={styles.title}>{t('privacyTitle')}</Text>
      <StatusMessage type="info" message={t('privacyBody')} />
      <View style={styles.card}>
        {points.map((p, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.tip}>{p}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text, marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 8 },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  bullet: { fontSize: 18, color: colors.primary, fontWeight: '800' },
  tip: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
});
