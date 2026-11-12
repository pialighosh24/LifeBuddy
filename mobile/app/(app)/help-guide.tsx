import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { colors, radii, typography } from '../../src/theme';

export default function HelpGuideScreen() {
  const { t } = useLanguage();
  const tips = [
    'Home: view today’s routine, medicine, emergency, and SOS summary from real backend data.',
    'My Care: open Daily Routines and Medicine for real records; Appointments and Tasks show honest unavailable states until backend support is approved/implemented.',
    'Talk: tap phrases to build a sentence, then Speak/Replay/Stop. Save favourites when supported.',
    'Assistance: open Help Me for stored guidance, SOS for emergency alert recording, and Emergency Contacts for call/message handoff.',
    'Profile: change app language (saved on device), view session/profile info, and read privacy/help information.',
  ];
  return (
    <Screen>
      <Text style={styles.title}>{t('helpGuideTitle')}</Text>
      <StatusMessage type="info" message={t('helpGuideBody')} />
      <View style={styles.card}>
        {tips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.tip}>{tip}</Text>
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
