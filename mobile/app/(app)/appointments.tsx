import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { colors, radii, typography } from '../../src/theme';

export default function AppointmentsScreen() {
  const { t } = useLanguage();
  return (
    <Screen>
      <Text style={styles.title}>{t('appointments')}</Text>
      <Text style={styles.subtitle}>Appointment date, time, location, caregiver notes, and upcoming/past sections.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('upcomingAppointments')}</Text>
        <StatusMessage type="info" message={t('noAppointmentsSupport')} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Past appointments</Text>
        <StatusMessage type="info" message="No past appointment records are shown because appointment backend support is not available in the current system." />
      </View>
      <StatusMessage type="warning" message={`${t('featureProposalNeeded')}: appointments require approved schema/API/dashboard/mobile integration before records can be created, stored, or displayed.`} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text, marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  cardTitle: { ...typography.subheading, color: colors.text, marginBottom: 8 },
});
