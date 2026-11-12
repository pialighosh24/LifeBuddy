import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { getRoutineProgress, getRoutinesForCareUser } from '../../src/services/api/routineApi';
import { ApiError } from '../../src/services/api/client';
import type { Routine, RoutineProgressItem } from '../../src/types/routine';
import { colors, radii, typography } from '../../src/theme';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function MyDayScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [progress, setProgress] = useState<RoutineProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'server' | 'cached' | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const careUserId = user?.role === 'user' ? user.id : null;
  const isCareUser = user?.role === 'user';

  const load = useCallback(async (isRefresh = false) => {
    if (!careUserId) {
      setLoading(false);
      setRefreshing(false);
      setRoutines([]);
      setProgress([]);
      setError(null);
      setSource(null);
      setLoadedAt(null);
      return;
    }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const date = todayIso();
      const [rRes, pRes] = await Promise.all([
        getRoutinesForCareUser(careUserId),
        getRoutineProgress(careUserId, date),
      ]);
      setRoutines(rRes.data.routines || []);
      setProgress(pRes.data.progress || []);
      setSource('server');
      setLoadedAt(new Date());
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('networkError');
      setError(msg);
      if (routines.length || progress.length) setSource('cached');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [careUserId, routines.length, progress.length, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const progressByRoutine = useMemo(() => {
    const map = new Map<number, RoutineProgressItem>();
    for (const p of progress) map.set(p.routineId, p);
    return map;
  }, [progress]);

  if (!isCareUser) {
    return (
      <Screen>
        <Text style={styles.title}>{t('myDayTitle')}</Text>
        <StatusMessage type="info" message={t('notCareUser')} />
        <StatusMessage type="info" message={t('notCareUserMyDayHint')} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <Text style={styles.title}>{t('myDayTitle')}</Text>
        <Text style={styles.subtitle}>{t('myDaySubtitle')}</Text>

        {source === 'cached' ? <StatusMessage type="warning" message={t('staleData')} /> : null}
        {source === 'server' && loadedAt ? <Text style={styles.meta}>{t('sourceServer')}: {loadedAt.toLocaleTimeString()}</Text> : null}
        {error ? <StatusMessage type="error" message={error} /> : null}

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>{t('loadingRoutines')}</Text></View>
        ) : null}

        {!loading && routines.length === 0 ? (
          <View>
            <StatusMessage type="info" message={t('noRoutines')} />
            <StatusMessage type="info" message={t('noRoutinesHint')} />
          </View>
        ) : null}

        {!loading ? routines.map((routine) => {
          const p = progressByRoutine.get(routine.id);
          const title = language === 'bn' ? (routine.titleBn || routine.titleEn) : routine.titleEn;
          const desc = language === 'bn' ? (routine.descriptionBn || routine.descriptionEn) : routine.descriptionEn;
          const total = p?.totalSteps ?? routine.stepCount ?? 0;
          const completed = p?.completedSteps ?? 0;
          const remaining = Math.max(0, total - completed);
          const percent = p?.progressPercent ?? (total > 0 ? Math.round((completed / total) * 100) : 0);
          const isDone = total > 0 && completed >= total;
          const status = p?.status || (isDone ? 'completed' : completed > 0 ? 'in_progress' : 'not_started');
          const statusLabel = status === 'completed' ? t('routineStatusCompleted') : status === 'in_progress' ? t('routineStatusInProgress') : t('routineStatusNotStarted');
          return (
            <Pressable
              key={routine.id}
              onPress={() => router.push(`/(app)/routine/${routine.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${t('progress')} ${percent}% . ${statusLabel}`}
              accessibilityHint={t('viewRoutine')}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}><Ionicons name="sunny" size={24} color={colors.white} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  {desc ? <Text style={styles.cardDesc}>{desc}</Text> : <Text style={styles.cardDesc}>{t('routineNoDescription')}</Text>}
                  {routine.isActive === false ? <Text style={styles.statusTag}>{t('routineInactive')}</Text> : null}
                </View>
              </View>

              <View style={styles.progressRow}>
                <Text style={styles.progressText}>{t('stepsLabel')}: {completed}/{total}</Text>
                <Text style={styles.progressText}>{t('remainingSteps')}: {remaining}</Text>
              </View>
              <View style={styles.barTrack} accessible accessibilityLabel={`${t('progress')} ${percent}%`}>
                <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, percent))}%` }]} />
              </View>
              <Text style={styles.percentText}>{t('progress')}: {percent}% • {statusLabel}</Text>

              {status === 'completed' ? <StatusMessage type="success" message={t('routineCompleted')} /> : null}
              {total === 0 ? <StatusMessage type="info" message={t('routineStepsUnavailable')} /> : null}

              <AppButton
                label={isDone ? t('viewRoutine') : (completed > 0 ? t('continueRoutine') : t('startRoutine'))}
                onPress={() => router.push(`/(app)/routine/${routine.id}`)}
                accessibilityLabel={isDone ? `${t('viewRoutine')}: ${title}` : (completed > 0 ? `${t('continueRoutine')}: ${title}` : `${t('startRoutine')}: ${title}`)}
              />
            </Pressable>
          );
        }) : null}

        <AppButton label={t('retryAction')} variant="outline" onPress={() => load(true)} disabled={loading || refreshing} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { ...typography.heading, color: colors.text, marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: 12 },
  meta: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  muted: { color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, padding: 14, marginBottom: 14 },
  pressed: { opacity: 0.95 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cardDay, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.subheading, color: colors.text },
  cardDesc: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { color: colors.text, fontWeight: '600' },
  barTrack: { height: 12, borderRadius: 6, backgroundColor: colors.border, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%', backgroundColor: colors.secondary },
  percentText: { color: colors.textMuted, marginBottom: 8, fontWeight: '600' },
  statusTag: { marginTop: 4, color: colors.warning, fontWeight: '700', fontSize: 13 },
});
