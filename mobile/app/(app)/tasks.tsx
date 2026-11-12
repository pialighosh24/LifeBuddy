import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { colors, radii, typography } from '../../src/theme';

export default function TasksScreen() {
  const { t } = useLanguage();
  return (
    <Screen>
      <Text style={styles.title}>{t('tasks')}</Text>
      <Text style={styles.subtitle}>Task list, due dates, priority, completion status, and task details.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('dailyTasksSummary')}</Text>
        <StatusMessage type="info" message={t('noTasksSupport')} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Completion status</Text>
        <StatusMessage type="info" message="Task completion cannot be persisted or displayed as real records because backend task support is not available in the current system." />
      </View>
      <StatusMessage type="warning" message={`${t('featureProposalNeeded')}: daily tasks require approved schema/API/dashboard/mobile integration before task records and completion can be stored.`} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text, marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  cardTitle: { ...typography.subheading, color: colors.text, marginBottom: 8 },
});
