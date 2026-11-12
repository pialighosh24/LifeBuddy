import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { getMedicineHistory, getMedicinesForCareUser } from '../../src/services/api/medicineApi';
import { ApiError } from '../../src/services/api/client';
import type { Medicine, MedicineLog } from '../../src/types/medicine';
import { colors, radii, typography } from '../../src/theme';

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function statusLabel(status: string, t: (k: any) => string) {
  if (status === 'taken') return t('taken');
  if (status === 'skipped') return t('skipped');
  if (status === 'missed') return t('missed');
  if (status === 'pending') return t('pending');
  return status;
}

export default function MedicineScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [history, setHistory] = useState<MedicineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'server' | 'cached' | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const careUserId = user?.role === 'user' ? user.id : null;
  const isCareUser = user?.role === 'user';

  const load = useCallback(async (isRefresh = false) => {
    if (!careUserId) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [mRes, hRes] = await Promise.all([
        getMedicinesForCareUser(careUserId),
        getMedicineHistory(careUserId),
      ]);
      setMedicines(mRes.data.medicines || []);
      setHistory((hRes.data.history || []).slice(0, 20));
      setSource('server');
      setLoadedAt(new Date());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('networkError'));
      if (medicines.length || history.length) setSource('cached');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [careUserId, t]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!isCareUser) {
    return (
      <Screen>
        <Text style={styles.title}>{t('medicineTitle')}</Text>
        <StatusMessage type="info" message={t('notCareUserMedicine')} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <Text style={styles.title}>{t('medicineTitle')}</Text>
        <Text style={styles.subtitle}>{t('medicineSubtitle')}</Text>

        {source === 'cached' ? <StatusMessage type="warning" message={t('staleData')} /> : null}
        {source === 'server' && loadedAt ? <Text style={styles.meta}>{t('sourceServer')}: {loadedAt.toLocaleTimeString()}</Text> : null}
        {error ? <StatusMessage type="error" message={error} /> : null}

        <StatusMessage type="info" message={t('serverStoredReminders')} />
        <StatusMessage type="info" message={t('notDeliveredClaim')} />
        <StatusMessage type="info" message={t('medicineActionRecordNote')} />

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>{t('loadingMedicines')}</Text></View>
        ) : null}

        {!loading && medicines.length === 0 ? (
          <View>
            <StatusMessage type="info" message={t('noMedicinesAssigned')} />
            <StatusMessage type="info" message={t('noMedicinesAssignedHint')} />
          </View>
        ) : null}

        {!loading ? medicines.map((med) => {
          const reminderCount = med.reminders?.length ?? 0;
          const reminderPreview = med.reminders && med.reminders.length
            ? med.reminders.slice(0, 3).map((r) => r.reminderTime?.slice(0, 5)).filter(Boolean).join(', ')
            : '';
          return (
            <Pressable
              key={med.id}
              onPress={() => router.push(`/(app)/medicine/${med.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${med.medicineName}. ${med.isActive ? t('active') : t('inactive')}. ${t('viewDetails')}`}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}><Ionicons name="medkit" size={24} color={colors.white} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{med.medicineName}</Text>
                  <Text style={styles.cardDesc}>{med.isActive ? t('active') : t('inactive')}</Text>
                </View>
              </View>
              {med.prescribedInstructions ? <Text style={styles.instructions} numberOfLines={3}>{med.prescribedInstructions}</Text> : <Text style={styles.muted}>{t('instructions')}: {t('unavailable')}</Text>}
              {(med.startDate || med.endDate) ? (
                <Text style={styles.meta}>{t('schedule')}: {formatDateOnly(med.startDate) || '—'} {med.endDate ? `→ ${formatDateOnly(med.endDate)}` : ''}</Text>
              ) : null}
              {reminderCount > 0 ? (
                <Text style={styles.meta}>{t('reminderCount', { count: String(reminderCount) })}{reminderPreview ? ` • ${reminderPreview}` : ''}</Text>
              ) : (
                <Text style={styles.meta}>{t('reminders')}: {t('noReminderAvailable')}</Text>
              )}
              <AppButton label={t('viewDetails')} onPress={() => router.push(`/(app)/medicine/${med.id}`)} variant="outline" />
            </Pressable>
          );
        }) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('medicineHistory')}</Text>
          {!loading && history.length === 0 ? <StatusMessage type="info" message={t('noHistoryAvailable')} /> : null}
          {history.map((log) => (
            <View key={log.id} style={styles.historyCard}>
              <Text style={styles.historyName}>{log.medicineName || `${t('medicineName')} #${log.medicineId}`}</Text>
              <Text style={styles.historyStatus}>{t('status')}: {statusLabel(log.status, t)}</Text>
              <Text style={styles.meta}>{t('scheduledFor')}: {formatDateTime(log.scheduledFor) || log.scheduledFor}</Text>
              <Text style={styles.meta}>{t('recordedAt')}: {formatDateTime(log.respondedAt) || t('unavailable')}</Text>
            </View>
          ))}
        </View>

        <AppButton label={t('retryAction')} variant="outline" onPress={() => load(true)} disabled={loading || refreshing} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { ...typography.heading, color: colors.text, marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: 12 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  muted: { color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, padding: 14, marginBottom: 14 },
  pressed: { opacity: 0.95 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cardMedicine, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.subheading, color: colors.text },
  cardDesc: { color: colors.textMuted, fontSize: 14 },
  instructions: { color: colors.text, fontSize: 15, marginBottom: 6 },
  section: { marginTop: 8 },
  sectionTitle: { ...typography.subheading, color: colors.text, marginBottom: 8 },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 12, marginBottom: 8 },
  historyName: { fontWeight: '700', color: colors.text, fontSize: 16 },
  historyStatus: { fontWeight: '600', color: colors.text, marginTop: 2 },
});
