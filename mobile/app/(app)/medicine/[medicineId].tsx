import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppButton } from '../../../src/components/AppButton';
import { StatusMessage } from '../../../src/components/StatusMessage';
import { useAuth } from '../../../src/context/AuthContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { createMedicineLog, getMedicine, getMedicineLogs } from '../../../src/services/api/medicineApi';
import { speakText, stopSpeaking } from '../../../src/services/speech/tts';
import { ApiError, getValidationMessages } from '../../../src/services/api/client';
import type { Medicine, MedicineLog, MedicineReminder } from '../../../src/types/medicine';
import { colors, radii, typography } from '../../../src/theme';

function todayYmd() { return new Date().toISOString().slice(0, 10); }
function dayCode(d: Date) { return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]; }
function isWithinDates(today: string, start: string | null, end: string | null) {
  if (start && today < String(start).slice(0, 10)) return false;
  if (end && today > String(end).slice(0, 10)) return false;
  return true;
}
function reminderAppliesToday(rem: MedicineReminder, med: Medicine, today = new Date()): boolean | null {
  const ymd = todayYmd();
  if (!rem.isActive || !med.isActive) return false;
  if (!isWithinDates(ymd, med.startDate, med.endDate)) return false;
  if (rem.frequency === 'daily') return true;
  if (rem.frequency === 'weekly') {
    const days = (rem.daysOfWeek || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (!days.length) return null; // unknown
    return days.includes(dayCode(today));
  }
  if (rem.frequency === 'once' || rem.frequency === 'custom') return null; // cannot determine reliably without more data
  return null;
}
function scheduledForToday(reminderTime: string) {
  const ymd = todayYmd();
  const t = reminderTime.length === 5 ? `${reminderTime}:00` : reminderTime;
  return `${ymd}T${t}`;
}
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
function formatTime(value: string | null | undefined) {
  if (!value) return null;
  const raw = String(value);
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  return raw;
}
function statusLabel(status: string, t: (k: any) => string) {
  if (status === 'taken') return t('taken');
  if (status === 'skipped') return t('skipped');
  if (status === 'missed') return t('missed');
  if (status === 'pending') return t('pending');
  return status;
}

export default function MedicineDetailScreen() {
  const { medicineId } = useLocalSearchParams<{ medicineId: string }>();
  const id = Number(medicineId);
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [logs, setLogs] = useState<MedicineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [source, setSource] = useState<'server' | 'cached' | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const isCareUser = user?.role === 'user';

  const load = useCallback(async (isRefresh = false) => {
    if (!id || Number.isNaN(id)) { setError(t('invalidMedicine')); setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [mRes, lRes] = await Promise.all([getMedicine(id), getMedicineLogs(id)]);
      setMedicine(mRes.data.medicine);
      setReminders(mRes.data.reminders || []);
      setLogs(lRes.data.logs || []);
      setSource('server');
      setLoadedAt(new Date());
    } catch (e) {
      setError(e instanceof ApiError ? (getValidationMessages(e.details) || e.message) : t('networkError'));
      if (medicine) setSource('cached');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, t]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  useEffect(() => () => { stopSpeaking().catch(() => {}); }, []);

  const todaysReminders = useMemo(() => {
    if (!medicine) return [] as { rem: MedicineReminder; applies: boolean | null }[];
    return reminders.map(rem => ({ rem, applies: reminderAppliesToday(rem, medicine) }));
  }, [reminders, medicine]);

  const onSpeakInstructions = async () => {
    const text = medicine?.prescribedInstructions?.trim();
    if (!text) return;
    setSpeechError(null);
    try { setSpeaking(true); await speakText(text, language); }
    catch { setSpeechError(t('ttsUnavailable')); }
    finally { setSpeaking(false); }
  };
  const onStop = async () => { await stopSpeaking().catch(()=>{}); setSpeaking(false); };

  const submitLog = async (status: 'taken' | 'skipped' | 'missed', scheduledFor: string, reminderId?: number | null) => {
    if (!isCareUser || !medicine) return;
    const key = `${status}|${scheduledFor}|${reminderId ?? 'none'}`;
    if (submittingKey) return; // prevent duplicates while submitting
    setSubmittingKey(key);
    setError(null); setInfo(null);
    try {
      await createMedicineLog(medicine.id, {
        status,
        scheduledFor,
        reminderId: reminderId ?? null,
        respondedAt: new Date().toISOString(),
      });
      setInfo(t('logSaved'));
      await load(true);
    } catch (e) {
      setError(e instanceof ApiError ? (getValidationMessages(e.details) || e.message) : t('logFailed'));
    } finally {
      setSubmittingKey(null);
    }
  };

  const renderField = (label: string, value: string | null | undefined) => (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value && String(value).trim() ? value : t('unavailable')}</Text>
    </View>
  );

  if (loading) {
    return <Screen><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>{t('loadingMedicines')}</Text></View></Screen>;
  }
  if (!medicine) {
    return <Screen><StatusMessage type="error" message={error || t('unavailable')} /><AppButton label={t('retryAction')} onPress={() => load()} /></Screen>;
  }

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <Text style={styles.title}>{medicine.medicineName}</Text>
        <Text style={styles.meta}>{t('status')}: {medicine.isActive ? t('active') : t('inactive')}</Text>

        {source === 'cached' ? <StatusMessage type="warning" message={t('staleData')} /> : null}
        {error ? <StatusMessage type="error" message={error} /> : null}
        {info ? <StatusMessage type="success" message={info} /> : null}
        {speechError ? <StatusMessage type="error" message={speechError} /> : null}
        {!isCareUser ? <StatusMessage type="info" message={t('notCareUserMedicine')} /> : null}
        <StatusMessage type="info" message={t('medicineActionRecordNote')} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('medicineDetails')}</Text>
          {renderField(t('instructions'), medicine.prescribedInstructions)}
          {renderField(t('notes'), medicine.notes)}
          {renderField(t('startDate'), formatDateOnly(medicine.startDate))}
          {renderField(t('endDate'), formatDateOnly(medicine.endDate))}
          <View style={styles.row}>
            <AppButton label={t('listenInstructions')} onPress={onSpeakInstructions} variant="secondary" style={styles.half} disabled={!medicine.prescribedInstructions || speaking} />
            <AppButton label={t('stopListening')} onPress={onStop} variant="outline" style={styles.half} disabled={!speaking} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('todaysSchedule')} / {t('reminders')}</Text>
          <StatusMessage type="info" message={t('serverStoredReminders')} />
          <StatusMessage type="info" message={t('notDeliveredClaim')} />
          {reminders.length === 0 ? <StatusMessage type="info" message={t('noReminderAvailable')} /> : null}
          {todaysReminders.map(({ rem, applies }) => {
            const sched = scheduledForToday(rem.reminderTime);
            const busyTaken = submittingKey === `taken|${sched}|${rem.id}`;
            const busySkipped = submittingKey === `skipped|${sched}|${rem.id}`;
            const busyMissed = submittingKey === `missed|${sched}|${rem.id}`;
            const appliesText = applies === null ? t('unavailable') : applies ? t('yes') : t('no');
            return (
              <View key={rem.id} style={styles.remCard}>
                <Text style={styles.remTitle}><Ionicons name="time" size={16} color={colors.primary} /> {rem.reminderLabel || t('reminder')} — {formatTime(rem.reminderTime)}</Text>
                <Text style={styles.meta}>{t('frequency')}: {rem.frequency} {rem.daysOfWeek ? `(${t('days')}: ${rem.daysOfWeek})` : ''}</Text>
                <Text style={styles.meta}>{t('status')}: {rem.isActive ? t('active') : t('inactive')}</Text>
                <Text style={styles.meta}>{t('appliesTodayBestEffort', { value: appliesText })}</Text>
                <Text style={styles.meta}>{t('scheduledFor')}: {formatDateTime(sched) || sched} ({t('serverStoredReminders')})</Text>
                {isCareUser ? (
                  <View>
                    <View style={styles.row}>
                      <AppButton label={busyTaken ? t('recording') : t('markAsTaken')} onPress={() => submitLog('taken', sched, rem.id)} style={styles.half} disabled={!!submittingKey} loading={busyTaken} />
                      <AppButton label={busySkipped ? t('recording') : t('markAsSkipped')} onPress={() => submitLog('skipped', sched, rem.id)} variant="outline" style={styles.half} disabled={!!submittingKey} loading={busySkipped} />
                    </View>
                    <AppButton label={busyMissed ? t('recording') : t('markAsMissed')} onPress={() => submitLog('missed', sched, rem.id)} variant="outline" disabled={!!submittingKey} loading={busyMissed} style={{ marginTop: 8 }} />
                  </View>
                ) : null}
              </View>
            );
          })}
          {isCareUser ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>{t('recordWithoutReminder')}</Text>
              <View style={styles.row}>
                <AppButton label={t('markAsTaken')} onPress={() => submitLog('taken', new Date().toISOString(), null)} style={styles.half} disabled={!!submittingKey} />
                <AppButton label={t('markAsSkipped')} onPress={() => submitLog('skipped', new Date().toISOString(), null)} variant="outline" style={styles.half} disabled={!!submittingKey} />
              </View>
              <AppButton label={t('markAsMissed')} onPress={() => submitLog('missed', new Date().toISOString(), null)} variant="outline" disabled={!!submittingKey} style={{ marginTop: 8 }} />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('medicineHistory')}</Text>
          {logs.length === 0 ? <StatusMessage type="info" message={t('noHistoryAvailable')} /> : null}
          {logs.map((log) => (
            <View key={log.id} style={styles.historyCard}>
              <Text style={styles.historyStatus}>{t('status')}: {statusLabel(log.status, t)}</Text>
              <Text style={styles.meta}>{t('scheduledFor')}: {formatDateTime(log.scheduledFor) || log.scheduledFor}</Text>
              <Text style={styles.meta}>{t('recordedAt')}: {formatDateTime(log.respondedAt) || t('unavailable')}</Text>
              {log.reminderId ? <Text style={styles.meta}>{t('reminder')} ID: {log.reminderId}</Text> : null}
              {log.notes ? <Text style={styles.meta}>{t('notes')}: {log.notes}</Text> : null}
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
  center: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  muted: { color: colors.textMuted },
  title: { ...typography.heading, color: colors.text, marginBottom: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 14 },
  sectionTitle: { ...typography.subheading, color: colors.text, marginBottom: 8 },
  fieldRow: { marginBottom: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: colors.textMuted, marginBottom: 2 },
  fieldValue: { fontSize: 16, color: colors.text },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  half: { flex: 1 },
  remCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 10, marginBottom: 10, backgroundColor: colors.background },
  remTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  historyCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 10, marginBottom: 8 },
  historyStatus: { fontSize: 16, fontWeight: '700', color: colors.text },
});
