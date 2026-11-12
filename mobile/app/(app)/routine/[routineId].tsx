import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppButton } from '../../../src/components/AppButton';
import { StatusMessage } from '../../../src/components/StatusMessage';
import { useAuth } from '../../../src/context/AuthContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { createRoutineCompletion, getRoutine, getRoutineCompletions, getRoutineProgress } from '../../../src/services/api/routineApi';
import { speakText, stopSpeaking } from '../../../src/services/speech/tts';
import { ApiError, getValidationMessages } from '../../../src/services/api/client';
import type { Routine, RoutineCompletion, RoutineProgressItem, RoutineStep } from '../../../src/types/routine';
import { colors, radii, typography } from '../../../src/theme';

function todayIso() { return new Date().toISOString().slice(0, 10); }

export default function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const id = Number(routineId);
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [completions, setCompletions] = useState<RoutineCompletion[]>([]);
  const [progress, setProgress] = useState<RoutineProgressItem | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [source, setSource] = useState<'server' | 'cached' | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const careUserId = user?.role === 'user' ? user.id : null;
  const isCareUser = user?.role === 'user';

  const load = useCallback(async (opts?: { keepIndex?: boolean }) => {
    if (!id || Number.isNaN(id)) { setError(t('routineNotAvailable')); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const date = todayIso();
      const reqs: any[] = [getRoutine(id), getRoutineCompletions(id, { date })];
      if (careUserId) reqs.push(getRoutineProgress(careUserId, date));
      const [rRes, cRes, pRes] = await Promise.all(reqs);
      const nextRoutine = rRes.data.routine;
      const nextSteps = (rRes.data.steps || []) as RoutineStep[];
      const nextComps = (cRes.data.completions || []) as RoutineCompletion[];
      setRoutine(nextRoutine);
      setSteps(nextSteps.sort((a: RoutineStep, b: RoutineStep) => a.stepOrder - b.stepOrder));
      setCompletions(nextComps);
      if (pRes) {
        const p = ((pRes.data.progress || []) as RoutineProgressItem[]).find((x) => x.routineId === id) || null;
        setProgress(p);
      }
      setSource('server');
      setLoadedAt(new Date());
      if (!opts?.keepIndex) {
        // jump to first incomplete step for today if possible
        const completedIds = new Set(nextComps.filter((c) => c.completionStatus === 'completed').map((c) => c.routineStepId));
        const firstIncomplete = nextSteps.findIndex((s: RoutineStep) => !completedIds.has(s.id));
        setIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? (getValidationMessages(e.details) || e.message) : t('networkError');
      setError(msg);
      if (routine) setSource('cached');
    } finally {
      setLoading(false);
    }
  }, [id, careUserId, t]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    return () => { stopSpeaking().catch(() => {}); };
  }, []);

  const completedStepIds = useMemo(() => new Set(completions.filter((c) => c.completionStatus === 'completed').map((c) => c.routineStepId)), [completions]);
  const currentStep = steps[index];
  const totalSteps = steps.length;
  const completedCount = progress?.completedSteps ?? completedStepIds.size;
  const remaining = Math.max(0, totalSteps - completedCount);
  const percent = progress?.progressPercent ?? (totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0);

  const routineTitle = routine ? (language === 'bn' ? (routine.titleBn || routine.titleEn) : routine.titleEn) : '';
  const stepInstruction = currentStep ? (language === 'bn' ? (currentStep.instructionBn || currentStep.instructionEn) : currentStep.instructionEn) : '';

  const speakCurrent = async () => {
    if (!stepInstruction) return;
    setSpeechError(null);
    try {
      setSpeaking(true);
      await speakText(stepInstruction, language);
    } catch {
      setSpeechError(t('ttsUnavailable'));
    } finally {
      setSpeaking(false);
    }
  };

  const stopVoice = async () => {
    await stopSpeaking().catch(() => {});
    setSpeaking(false);
  };

  const onMarkComplete = async () => {
    if (!currentStep || !isCareUser || submitting) return;
    if (completedStepIds.has(currentStep.id)) { setInfo(t('alreadyCompleted')); return; }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const clientEventId = `routine-${id}-step-${currentStep.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await createRoutineCompletion(id, {
        routineStepId: currentStep.id,
        completionStatus: 'completed',
        completedAt: new Date().toISOString(),
        source: 'online',
        clientEventId,
      });
      setInfo(t('stepCompleted'));
      // refresh authoritative progress/completions from backend
      await load({ keepIndex: true });
    } catch (e) {
      if (e instanceof ApiError) {
        // on conflict/duplicate or validation, refresh authoritative state
        if (e.status === 409 || e.status === 400) {
          await load({ keepIndex: true }).catch(() => {});
        }
        setError(getValidationMessages(e.details) || e.message || t('completionFailed'));
      } else {
        setError(t('completionFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onExit = () => {
    Alert.alert(t('exitRoutine'), t('exitRoutineConfirm'), [
      { text: t('stay'), style: 'cancel' },
      { text: t('leave'), style: 'destructive', onPress: () => { stopSpeaking().catch(()=>{}); router.back(); } },
    ]);
  };

  const onPrev = () => setIndex(i => Math.max(0, i - 1));
  const onNext = () => setIndex(i => Math.min(totalSteps - 1, i + 1));

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>{t('loadingRoutine')}</Text></View>
      </Screen>
    );
  }

  if (!routine) {
    return (
      <Screen>
        <StatusMessage type="error" message={error || t('routineNotAvailable')} />
        <AppButton label={t('retryAction')} onPress={() => load()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel={t('exitRoutine')} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>{routineTitle}</Text>
      </View>

      {source === 'cached' ? <StatusMessage type="warning" message={t('staleData')} /> : null}
      {source === 'server' && loadedAt ? <Text style={styles.meta}>{t('sourceServer')}: {loadedAt.toLocaleTimeString()}</Text> : null}
      {error ? <StatusMessage type="error" message={error} /> : null}
      {info ? <StatusMessage type="success" message={info} /> : null}
      {speechError ? <StatusMessage type="error" message={speechError} /> : null}
      {!isCareUser ? <StatusMessage type="info" message={t('notCareUser')} /> : null}

      <View style={styles.progressBox}>
        <Text style={styles.progressTitle}>{t('progress')}: {percent}%</Text>
        <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, percent))}%` }]} /></View>
        <Text style={styles.progressMeta}>{t('completedLabel')}: {completedCount} / {totalSteps} • {t('remainingSteps')}: {remaining}</Text>
        {totalSteps > 0 && completedCount >= totalSteps ? <StatusMessage type="success" message={t('routineCompleted')} /> : null}
      </View>

      {totalSteps === 0 ? (
        <StatusMessage type="info" message={t('noSteps')} />
      ) : currentStep ? (
        <View style={styles.stepCard}>
          <Text style={styles.stepCounter}>{t('stepOf', { current: String(index + 1), total: String(totalSteps) })}</Text>
          <View style={styles.visualBox}>
            {currentStep.imageKey ? (
              <View style={styles.imagePlaceholder} accessibilityLabel={`Step visual: ${currentStep.imageKey}`}>
                <Ionicons name="image" size={42} color={colors.primary} />
                <Text style={styles.imageKeyText}>{currentStep.imageKey}</Text>
              </View>
            ) : (
              <View style={styles.imagePlaceholder} accessibilityLabel="Step illustration">
                <Ionicons name="list-circle" size={48} color={colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.instruction}>{stepInstruction}</Text>
          {language === 'bn' && !currentStep.instructionBn ? <Text style={styles.fallbackNote}>{t('routineBnUnavailableShowingOriginal')}</Text> : null}
          {language === 'en' && currentStep.instructionBn ? <Text style={styles.fallbackNote}>{t('routineBnAvailable')}</Text> : null}

          {completedStepIds.has(currentStep.id) ? <StatusMessage type="success" message={t('alreadyCompleted')} /> : null}

          <View style={styles.row}>
            <AppButton label={t('repeatVoice')} onPress={speakCurrent} variant="secondary" style={styles.half} disabled={speaking || !stepInstruction} />
            <AppButton label={t('stopVoice')} onPress={stopVoice} variant="outline" style={styles.half} disabled={!speaking} />
          </View>

          <AppButton
            label={t('markComplete')}
            onPress={onMarkComplete}
            disabled={!isCareUser || submitting || completedStepIds.has(currentStep.id)}
            loading={submitting}
            accessibilityLabel={t('markComplete')}
          />

          <View style={styles.row}>
            <AppButton label={t('previous')} onPress={onPrev} variant="outline" style={styles.half} disabled={index <= 0} />
            <AppButton label={t('next')} onPress={onNext} variant="outline" style={styles.half} disabled={index >= totalSteps - 1} />
          </View>
        </View>
      ) : null}

      <AppButton label={t('retryAction')} variant="outline" onPress={() => load({ keepIndex: true })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 8 },
  muted: { color: colors.textMuted },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  title: { ...typography.subheading, color: colors.text, flex: 1 },
  meta: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  progressBox: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 12 },
  progressTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  progressMeta: { color: colors.textMuted, fontWeight: '600', marginTop: 4 },
  barTrack: { height: 12, borderRadius: 6, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.secondary },
  stepCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.primary, padding: 14, marginBottom: 12 },
  stepCounter: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  visualBox: { alignItems: 'center', marginBottom: 12 },
  imagePlaceholder: { width: '100%', minHeight: 120, borderRadius: radii.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', padding: 12 },
  imageKeyText: { marginTop: 6, color: colors.primaryDark, fontWeight: '600' },
  instruction: { fontSize: 24, lineHeight: 32, fontWeight: '700', color: colors.text, marginBottom: 8 },
  fallbackNote: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
});
