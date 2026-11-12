import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { ActionTile } from '../../src/components/ActionTile';
import { AppButton } from '../../src/components/AppButton';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { getRoutineProgress } from '../../src/services/api/routineApi';
import { getMedicineHistory, getMedicinesForCareUser } from '../../src/services/api/medicineApi';
import { getCareUserSosAlerts, getEmergencyContacts } from '../../src/services/api/sosApi';
import { ApiError } from '../../src/services/api/client';
import { loadFeelingsHistory, type FeelingHistoryEntry, type FeelingId } from '../../src/services/storage/feelingsStorage';
import type { RoutineProgressItem } from '../../src/types/routine';
import type { Medicine, MedicineLog } from '../../src/types/medicine';
import type { EmergencyContact, SosAlert } from '../../src/types/sos';
import { colors, radii, typography } from '../../src/theme';

function todayIso() { return new Date().toISOString().slice(0, 10); }

function InfoLink({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.infoLink, pressed && { opacity: 0.9 }]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.infoLinkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<RoutineProgressItem[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [history, setHistory] = useState<MedicineLog[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [latestFeeling, setLatestFeeling] = useState<FeelingHistoryEntry | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const careUserId = user?.role === 'user' ? user.id : null;
  const name = user?.displayName || user?.fullName || (user?.role === 'caregiver' ? 'Caregiver' : 'Care User');

  const load = useCallback(async (isRefresh = false) => {
    try {
      const feelings = await loadFeelingsHistory();
      setLatestFeeling(feelings[0] || null);
    } catch {
      setLatestFeeling(null);
    }

    if (!careUserId) {
      setLoading(false);
      setRefreshing(false);
      setProgress([]); setMedicines([]); setHistory([]); setContacts([]); setAlerts([]);
      return;
    }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [pRes, mRes, hRes, cRes, aRes] = await Promise.allSettled([
        getRoutineProgress(careUserId, todayIso()),
        getMedicinesForCareUser(careUserId),
        getMedicineHistory(careUserId),
        getEmergencyContacts(careUserId),
        getCareUserSosAlerts(careUserId),
      ]);
      if (pRes.status === 'fulfilled') setProgress(pRes.value.data.progress || []); else setProgress([]);
      if (mRes.status === 'fulfilled') setMedicines(mRes.value.data.medicines || []); else setMedicines([]);
      if (hRes.status === 'fulfilled') setHistory(hRes.value.data.history || []); else setHistory([]);
      if (cRes.status === 'fulfilled') setContacts(cRes.value.data.contacts || []); else setContacts([]);
      if (aRes.status === 'fulfilled') setAlerts(aRes.value.data.alerts || []); else setAlerts([]);
      const rejected = [pRes, mRes, hRes, cRes, aRes].find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
      if (rejected) {
        const e = rejected.reason;
        setError(e instanceof ApiError ? e.message : t('networkError'));
      }
      setLoadedAt(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [careUserId, t]);

  useEffect(() => { load(); }, [load]);

  const routinesDone = progress.filter(p => p.status === 'completed').length;
  const routinesInProgress = progress.filter(p => p.status === 'in_progress').length;
  const recentLogs = useMemo(() => [...history].sort((a, b) => String(b.respondedAt || b.scheduledFor || '').localeCompare(String(a.respondedAt || a.scheduledFor || ''))).slice(0, 3), [history]);
  const recentAlerts = useMemo(() => [...alerts].sort((a, b) => String(b.triggeredAt || b.createdAt || '').localeCompare(String(a.triggeredAt || a.createdAt || ''))).slice(0, 2), [alerts]);
  const primaryContact = contacts.find(c => c.isPrimary) || contacts[0] || null;

  const feelingLabelKey = (id: FeelingId) => {
    switch (id) {
      case 'happy': return 'feelingHappy';
      case 'sad': return 'feelingSad';
      case 'angry': return 'feelingAngry';
      case 'afraid': return 'feelingAfraid';
      case 'tired': return 'feelingTired';
      case 'confused': return 'feelingConfused';
      case 'in_pain': return 'feelingInPain';
      case 'need_help': return 'feelingNeedHelp';
      case 'speak_feeling': return 'feelingSpeakFeeling';
      default: return 'feelingHappy';
    }
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <Text style={styles.greeting}>{t('homeGreeting', { name })}</Text>
        <Text style={styles.sub}>{t('homeSub')}</Text>

        <View style={styles.grid}>
          <View style={styles.row}>
            <ActionTile label={t('talk')} icon="chatbubbles" color={colors.cardTalk} onPress={() => router.push('/(app)/talk')} accessibilityLabel={t('talk')} />
            <ActionTile label={t('myDay')} icon="sunny" color={colors.cardDay} onPress={() => router.push('/(app)/my-day')} accessibilityLabel={t('myDay')} />
          </View>
          <View style={styles.row}>
            <ActionTile label={t('medicine')} icon="medkit" color={colors.cardMedicine} onPress={() => router.push('/(app)/medicine')} accessibilityLabel={t('medicine')} />
            <ActionTile label={t('myFeelings')} icon="happy" color={colors.cardFeelings} onPress={() => router.push('/(app)/my-feelings')} accessibilityLabel={t('myFeelings')} />
          </View>
          <View style={styles.row}>
            <ActionTile label={t('helpMe')} icon="hand-left" color={colors.cardHelp} onPress={() => router.push('/(app)/help-me')} accessibilityLabel={t('helpMe')} />
            <ActionTile label={t('sos')} icon="alert-circle" color={colors.sos} onPress={() => router.push('/(app)/sos')} accessibilityLabel={t('sos')} />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>{t('todaySummary')}</Text>
          <Text style={styles.sectionLabel}>{t('feelingsLatestTitle')}</Text>
          {latestFeeling ? (
            <Text style={styles.meta}>
              {t(feelingLabelKey(latestFeeling.feelingId))} — {new Date(latestFeeling.timestamp).toLocaleString()} ({t('feelingsSavedOnDevice')})
            </Text>
          ) : (
            <Text style={styles.meta}>{t('feelingsLatestNone')}</Text>
          )}

          {!careUserId ? (
            <StatusMessage type="info" message={t('summaryUnavailable')} />
          ) : loading ? (
            <View style={styles.center}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.meta}>{t('loading')}</Text></View>
          ) : (
            <View>
              {error ? <StatusMessage type="error" message={error} /> : null}
              {loadedAt ? <Text style={styles.meta}>{t('sourceServer')}: {loadedAt.toLocaleTimeString()}</Text> : null}

              <Text style={styles.sectionLabel}>{t('routinesToday')}</Text>
              <Text style={styles.value}>{t('homeRoutinesSummary', { total: String(progress.length), completed: String(routinesDone), inProgress: String(routinesInProgress) })}</Text>

              <Text style={styles.sectionLabel}>{t('medicinesSummary')}</Text>
              <Text style={styles.value}>{t('homeMedicinesSummaryCounts', { medicines: String(medicines.length), history: String(history.length) })}</Text>
              {recentLogs.length ? recentLogs.map(log => (
                <Text key={log.id} style={styles.meta}>• {log.medicineName || `Medicine #${log.medicineId}`}: {log.status} ({log.scheduledFor})</Text>
              )) : <Text style={styles.meta}>{t('noHistoryAvailable')}</Text>}

              <Text style={styles.sectionLabel}>{t('emergencyInfo')}</Text>
              <Text style={styles.value}>{contacts.length} contact(s)</Text>
              {primaryContact ? <Text style={styles.meta}>• {t('primaryContact')}: {primaryContact.contactName} ({primaryContact.phoneNumber})</Text> : <Text style={styles.meta}>{t('noEmergencyContacts')}</Text>}

              <Text style={styles.sectionLabel}>{t('recentSosAlerts')}</Text>
              {recentAlerts.length ? recentAlerts.map(a => (
                <Text key={a.id} style={styles.meta}>• #{a.id} {a.alertStatus} • delivery: {a.deliveryStatus}</Text>
              )) : <Text style={styles.meta}>{t('noPreviousAlerts')}</Text>}

              <Text style={styles.sectionLabel}>{t('pendingAssistance')}</Text>
              <Text style={styles.meta}>{t('noPersistentHelpRequests')}</Text>

              <AppButton label={t('refreshSummary')} variant="outline" onPress={() => load(true)} style={{ marginTop: 10 }} />
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>More</Text>
          <Text style={styles.meta}>Appointments and Daily Tasks are not available yet (no backend support). No fake records are shown.</Text>
          <View style={{ marginTop: 8 }}>
            <InfoLink label={t('emergencyContactsNav')} icon="call" onPress={() => router.push('/(app)/emergency-contacts')} />
            <InfoLink label={t('appointments')} icon="calendar" onPress={() => router.push('/(app)/appointments')} />
            <InfoLink label={t('tasks')} icon="checkbox" onPress={() => router.push('/(app)/tasks')} />
            <InfoLink label={t('helpGuide')} icon="book" onPress={() => router.push('/(app)/help-guide')} />
            <InfoLink label={t('privacyInfo')} icon="shield-checkmark" onPress={() => router.push('/(app)/privacy')} />
            <InfoLink label={t('accessibilitySettings')} icon="accessibility" onPress={() => router.push('/(app)/accessibility-settings')} />
          </View>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.cardTitle}>{t('profileSession')}</Text>
          <AppButton label={t('profileSession')} variant="outline" onPress={() => router.push('/(app)/profile')} accessibilityLabel={t('profileSession')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  greeting: { ...typography.heading, color: colors.text, marginBottom: 4 },
  sub: { ...typography.body, color: colors.textMuted, marginBottom: 16 },
  grid: { marginHorizontal: -6 },
  row: { flexDirection: 'row' },
  profileCard: { marginTop: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  summaryCard: { marginTop: 16, backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  infoCard: { marginTop: 16, backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  cardTitle: { ...typography.subheading, color: colors.text, marginBottom: 8 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 10 },
  value: { fontSize: 15, color: colors.text, marginTop: 2 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  center: { alignItems: 'center', paddingVertical: 8, gap: 6 },
  infoLink: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  infoLinkText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
});
