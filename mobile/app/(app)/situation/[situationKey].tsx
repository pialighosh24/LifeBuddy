import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppButton } from '../../../src/components/AppButton';
import { StatusMessage } from '../../../src/components/StatusMessage';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { getSituation } from '../../../src/services/api/situationApi';
import { speakText, stopSpeaking } from '../../../src/services/speech/tts';
import { ApiError } from '../../../src/services/api/client';
import type { SituationDetail, SituationStep } from '../../../src/types/situation';
import { colors, radii, typography } from '../../../src/theme';

function isEmergencySituation(key: string, title: string) {
  const text = `${key} ${title}`.toLowerCase();
  return ['emergency', 'sos', 'danger', 'fire', 'hurt', 'injury', 'accident'].some(k => text.includes(k));
}

export default function SituationDetailScreen() {
  const { situationKey } = useLocalSearchParams<{ situationKey: string }>();
  const key = decodeURIComponent(String(situationKey || ''));
  const router = useRouter();
  const { t, language } = useLanguage();

  const [situation, setSituation] = useState<SituationDetail | null>(null);
  const [steps, setSteps] = useState<SituationStep[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const load = useCallback(async () => {
    if (!key) { setError(t('situationNotFound')); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await getSituation(key);
      setSituation(res.data.situation);
      const ordered = (res.data.steps || []).slice().sort((a: SituationStep, b: SituationStep) => a.stepOrder - b.stepOrder);
      setSteps(ordered);
      setIndex(0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('networkError'));
    } finally {
      setLoading(false);
    }
  }, [key, t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { stopSpeaking().catch(() => {}); }, []);

  const total = steps.length;
  const current = steps[index];
  const situationTitle = situation ? (language === 'bn' ? (situation.titleBn || situation.titleEn || situation.situationKey) : (situation.titleEn || situation.titleBn || situation.situationKey)) : key;
  const instruction = current ? (language === 'bn' ? (current.instructionBn || current.instructionEn || '') : (current.instructionEn || current.instructionBn || '')) : '';
  const stepTitle = current ? (language === 'bn' ? (current.titleBn || current.titleEn || '') : (current.titleEn || current.titleBn || '')) : '';
  const emergency = isEmergencySituation(key, situationTitle);

  const speakCurrent = async () => {
    if (!instruction.trim()) { setSpeechError(t('noInstructionsAvailable')); return; }
    setSpeechError(null);
    try { setSpeaking(true); await speakText(instruction, language); }
    catch { setSpeechError(t('voiceUnavailable')); }
    finally { setSpeaking(false); }
  };

  const stopVoice = async () => { await stopSpeaking().catch(()=>{}); setSpeaking(false); };

  const onExit = () => {
    Alert.alert(t('exitSituation'), t('exitSituationConfirm'), [
      { text: t('stay'), style: 'cancel' },
      { text: t('leave'), style: 'destructive', onPress: async () => { await stopVoice(); router.back(); } },
    ]);
  };

  const onPrev = () => setIndex(i => Math.max(0, i - 1));
  const onNext = () => setIndex(i => Math.min(total - 1, i + 1));

  if (loading) {
    return <Screen><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>{t('loadingSituation')}</Text></View></Screen>;
  }

  if (!situation) {
    return (
      <Screen>
        <StatusMessage type="error" message={error || t('situationNotFound')} />
        <AppButton label={t('retryAction')} onPress={load} />
        <AppButton label={t('back')} variant="outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel={t('back')} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>{situationTitle}</Text>
      </View>

      {error ? <StatusMessage type="error" message={error} /> : null}
      {speechError ? <StatusMessage type="error" message={speechError} /> : null}

      {emergency ? (
        <View>
          <StatusMessage type="warning" message={t('emergencySafetyNote')} />
          <AppButton label={t('openSos')} variant="danger" onPress={() => router.push('/(app)/sos')} accessibilityLabel={t('openSos')} />
        </View>
      ) : (
        <StatusMessage type="info" message={t('storedGuidanceNote')} />
      )}

      {total === 0 ? (
        <StatusMessage type="info" message={t('noInstructionsAvailable')} />
      ) : current ? (
        <View style={styles.stepCard}>
          <Text style={styles.stepCounter}>{t('stepOfTotal', { current: String(index + 1), total: String(total) })}</Text>
          <View style={styles.visualBox}>
            {current.imageKey ? (
              <View style={styles.imagePlaceholder} accessibilityLabel={`Step visual: ${current.imageKey}`}>
                <Ionicons name="image" size={42} color={colors.primary} />
                <Text style={styles.imageKeyText}>{current.imageKey}</Text>
              </View>
            ) : (
              <View style={styles.imagePlaceholder} accessibilityLabel="Step illustration">
                <Ionicons name="information-circle" size={48} color={colors.primary} />
              </View>
            )}
          </View>
          {stepTitle ? <Text style={styles.stepTitle}>{stepTitle}</Text> : null}
          {instruction.trim() ? (
            <Text style={styles.instruction}>{instruction}</Text>
          ) : (
            <StatusMessage type="info" message={t('noInstructionsAvailable')} />
          )}
          {language === 'bn' && !current.instructionBn ? <Text style={styles.fallbackNote}>Showing available original text (no Bengali translation provided).</Text> : null}
          {language === 'en' && current.instructionBn ? <Text style={styles.fallbackNote}>Bengali instruction available.</Text> : null}

          <View style={styles.row}>
            <AppButton label={t('repeatVoiceHelp')} onPress={speakCurrent} variant="secondary" style={styles.half} disabled={speaking || !instruction.trim()} />
            <AppButton label={t('stopVoiceHelp')} onPress={stopVoice} variant="outline" style={styles.half} disabled={!speaking} />
          </View>

          <View style={styles.row}>
            <AppButton label={t('previousStep')} onPress={onPrev} variant="outline" style={styles.half} disabled={index <= 0} />
            {index >= total - 1 ? (
              <AppButton label={t('finish')} onPress={onExit} variant="outline" style={styles.half} />
            ) : (
              <AppButton label={t('nextStep')} onPress={onNext} variant="outline" style={styles.half} disabled={index >= total - 1} />
            )}
          </View>
        </View>
      ) : null}

      <AppButton label={t('retryAction')} variant="outline" onPress={load} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 8 },
  muted: { color: colors.textMuted },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  title: { ...typography.subheading, color: colors.text, flex: 1 },
  stepCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.primary, padding: 14, marginVertical: 12 },
  stepCounter: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  visualBox: { alignItems: 'center', marginBottom: 12 },
  imagePlaceholder: { width: '100%', minHeight: 120, borderRadius: radii.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', padding: 12 },
  imageKeyText: { marginTop: 6, color: colors.primaryDark, fontWeight: '600' },
  stepTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 6 },
  instruction: { fontSize: 22, lineHeight: 30, fontWeight: '700', color: colors.text, marginBottom: 8 },
  fallbackNote: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  half: { flex: 1 },
});
