import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { speakText, stopSpeaking } from '../../src/services/speech/tts';
import {
  addFeelingEntry,
  clearFeelingsHistory,
  loadFeelingsHistory,
  FEELINGS_HISTORY_LIMIT,
  type FeelingHistoryEntry,
  type FeelingId,
} from '../../src/services/storage/feelingsStorage';
import { colors, radii, typography } from '../../src/theme';

interface FeelingOption {
  id: FeelingId;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey:
    | 'feelingHappy'
    | 'feelingSad'
    | 'feelingAngry'
    | 'feelingAfraid'
    | 'feelingTired'
    | 'feelingConfused'
    | 'feelingInPain'
    | 'feelingNeedHelp'
    | 'feelingSpeakFeeling';
  responseKey:
    | 'feelingResponseHappy'
    | 'feelingResponseSad'
    | 'feelingResponseAngry'
    | 'feelingResponseAfraid'
    | 'feelingResponseTired'
    | 'feelingResponseConfused'
    | 'feelingResponseInPain'
    | 'feelingResponseNeedHelp'
    | 'feelingResponseSpeakFeeling';
  color: string;
}

const FEELINGS: FeelingOption[] = [
  { id: 'happy', icon: 'happy', labelKey: 'feelingHappy', responseKey: 'feelingResponseHappy', color: '#2F855A' },
  { id: 'sad', icon: 'sad', labelKey: 'feelingSad', responseKey: 'feelingResponseSad', color: '#2B6CB0' },
  { id: 'angry', icon: 'flame', labelKey: 'feelingAngry', responseKey: 'feelingResponseAngry', color: '#C53030' },
  { id: 'afraid', icon: 'alert', labelKey: 'feelingAfraid', responseKey: 'feelingResponseAfraid', color: '#6B46C1' },
  { id: 'tired', icon: 'bed', labelKey: 'feelingTired', responseKey: 'feelingResponseTired', color: '#4A5568' },
  { id: 'confused', icon: 'help-circle', labelKey: 'feelingConfused', responseKey: 'feelingResponseConfused', color: '#B7791F' },
  { id: 'in_pain', icon: 'medkit', labelKey: 'feelingInPain', responseKey: 'feelingResponseInPain', color: '#C05621' },
  { id: 'need_help', icon: 'hand-left', labelKey: 'feelingNeedHelp', responseKey: 'feelingResponseNeedHelp', color: '#0B6E99' },
  { id: 'speak_feeling', icon: 'volume-high', labelKey: 'feelingSpeakFeeling', responseKey: 'feelingResponseSpeakFeeling', color: '#1D4ED8' },
];

function formatTimestamp(ts: string, locale: string) {
  try {
    return new Date(ts).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US');
  } catch {
    return ts;
  }
}

export default function MyFeelingsScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [selectedId, setSelectedId] = useState<FeelingId | null>(null);
  const [history, setHistory] = useState<FeelingHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const selected = useMemo(() => FEELINGS.find((f) => f.id === selectedId) || null, [selectedId]);
  const latest = history[0] || null;
  const latestFeeling = latest ? FEELINGS.find((f) => f.id === latest.feelingId) || null : null;

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const loaded = await loadFeelingsHistory();
      setHistory(loaded);
      setStorageError(null);
    } catch {
      setHistory([]);
      setStorageError(t('feelingsLoadFailed'));
    } finally {
      setHistoryLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onSelect = async (id: FeelingId) => {
    setSelectedId(id);
    setSpeechError(null);
    setActionInfo(null);
    try {
      const next = await addFeelingEntry(id);
      setHistory(next);
      setStorageError(null);
    } catch {
      setStorageError(t('feelingsSaveFailed'));
    }
  };

  const onClearSelection = async () => {
    await stopSpeaking().catch(() => {});
    setSpeaking(false);
    setSelectedId(null);
    setSpeechError(null);
    setActionInfo(t('feelingsSelectionCleared'));
  };

  const speakPhrase = async (phrase: string) => {
    setSpeechError(null);
    try {
      setSpeaking(true);
      await speakText(phrase, language);
    } catch {
      setSpeechError(t('ttsUnavailable'));
    } finally {
      setSpeaking(false);
    }
  };

  const onSpeakSelected = async () => {
    if (!selected) return;
    const label = t(selected.labelKey);
    const phrase =
      selected.id === 'speak_feeling'
        ? t('feelingResponseSpeakFeeling')
        : language === 'bn'
          ? `আমি অনুভব করছি: ${label}`
          : `I feel ${label}`;
    await speakPhrase(phrase);
  };

  const onSpeakResponse = async () => {
    if (!selected) return;
    await speakPhrase(t(selected.responseKey));
  };

  const confirmDeleteHistory = () => {
    Alert.alert(
      t('feelingsDeleteHistoryConfirmTitle'),
      t('feelingsDeleteHistoryConfirmMessage'),
      [
        { text: t('feelingsDeleteHistoryCancel'), style: 'cancel' },
        {
          text: t('feelingsDeleteHistoryConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearFeelingsHistory();
              setHistory([]);
              setStorageError(null);
              setActionInfo(t('feelingsHistoryDeleted'));
            } catch {
              setStorageError(t('feelingsHistoryDeleteFailed'));
            }
          },
        },
      ]
    );
  };

  const renderActions = () => {
    if (!selected) return null;
    if (selected.id === 'need_help') {
      return (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>{t('feelingActionSafeCalm')}</Text>
          <StatusMessage type="info" message={t('needHelpActionNote')} />
          <AppButton label={t('feelingActionOpenHelpMe')} onPress={() => router.push('/(app)/help-me')} variant="secondary" />
          <AppButton label={t('feelingActionOpenSos')} onPress={() => router.push('/(app)/sos')} />
        </View>
      );
    }
    if (selected.id === 'in_pain') {
      return (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>{t('feelingActionSafeCalm')}</Text>
          <StatusMessage type="warning" message={t('inPainActionNote')} />
          <AppButton label={t('feelingActionOpenEmergencyContacts')} onPress={() => router.push('/(app)/emergency-contacts')} variant="secondary" />
          <AppButton label={t('feelingActionOpenHelpMe')} onPress={() => router.push('/(app)/help-me')} variant="outline" />
          <AppButton label={t('feelingActionOpenSos')} onPress={() => router.push('/(app)/sos')} />
        </View>
      );
    }
    if (selected.id === 'speak_feeling') {
      return (
        <View style={styles.actionBox}>
          <StatusMessage type="info" message={t('speakFeelingOptionNote')} />
          <AppButton label={t('feelingActionSpeakSelected')} onPress={onSpeakSelected} disabled={speaking} loading={speaking} />
          <AppButton label={t('feelingActionStopSpeech')} onPress={() => stopSpeaking().catch(() => {}).finally(() => setSpeaking(false))} variant="outline" disabled={!speaking} />
        </View>
      );
    }
    return (
      <View style={styles.actionBox}>
        <Text style={styles.actionTitle}>{t('feelingActionSafeCalm')}</Text>
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('feelingsTitle')}</Text>
        <Text style={styles.subtitle}>{t('feelingsSubtitle')}</Text>

        <StatusMessage type="info" message={t('feelingsLocalNote')} />
        {storageError ? <StatusMessage type="error" message={storageError} /> : null}
        {speechError ? <StatusMessage type="error" message={speechError} /> : null}
        {actionInfo ? <StatusMessage type="info" message={actionInfo} /> : null}

        <View style={styles.statusBox} accessibilityLiveRegion="polite">
          <Text style={styles.statusText}>
            {selected ? t('feelingsSelected', { feeling: t(selected.labelKey) }) : t('feelingsNone')}
          </Text>
        </View>

        <View style={styles.grid}>
          {FEELINGS.map((f) => {
            const isSelected = f.id === selectedId;
            const label = t(f.labelKey);
            return (
              <Pressable
                key={f.id}
                onPress={() => onSelect(f.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={label}
                accessibilityHint={t('feelingsSubtitle')}
                style={({ pressed }) => [
                  styles.card,
                  { borderColor: f.color },
                  isSelected && { backgroundColor: f.color },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name={f.icon} size={34} color={isSelected ? colors.white : f.color} />
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>{label}</Text>
                {isSelected ? <Text style={styles.selectedMark}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {selected ? (
          <View style={styles.responseBox}>
            <Text style={styles.responseTitle}>{t('feelingsSelected', { feeling: t(selected.labelKey) })}</Text>
            <Text style={styles.responseText}>{t(selected.responseKey)}</Text>
            <View style={styles.inlineActions}>
              <AppButton label={speaking ? t('feelingActionStopSpeech') : t('feelingActionSpeakSelected')} onPress={speaking ? () => stopSpeaking().catch(() => {}).finally(() => setSpeaking(false)) : onSpeakSelected} disabled={!selected} variant="secondary" style={styles.halfBtn} />
              <AppButton label={t('replay')} onPress={onSpeakResponse} disabled={!selected || speaking} variant="outline" style={styles.halfBtn} />
            </View>
            {renderActions()}
          </View>
        ) : null}

        <View style={styles.actions}>
          <AppButton label={t('clearFeeling')} onPress={onClearSelection} variant="outline" disabled={!selected && !speaking} />
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t('feelingsLatestTitle')}</Text>
          {latest && latestFeeling ? (
            <Text style={styles.latestText}>
              {t(latestFeeling.labelKey)} — {formatTimestamp(latest.timestamp, language)} ({t('feelingsSavedOnDevice')})
            </Text>
          ) : (
            <Text style={styles.muted}>{historyLoading ? t('loading') : t('feelingsLatestNone')}</Text>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('feelingsHistoryTitle')}</Text>
          <StatusMessage type="info" message={`${t('feelingsHistoryLocalNote')} ${t('feelingsHistoryEmpty') && history.length === 0 ? '' : ''}`.trim()} />
          {historyLoading ? <Text style={styles.muted}>{t('loading')}</Text> : null}
          {!historyLoading && history.length === 0 ? <Text style={styles.muted}>{t('feelingsHistoryEmpty')}</Text> : null}
          {history.map((entry) => {
            const feeling = FEELINGS.find((f) => f.id === entry.feelingId);
            return (
              <View key={entry.id} style={styles.historyItem}>
                <Text style={styles.historyLabel}>{feeling ? t(feeling.labelKey) : entry.feelingId}</Text>
                <Text style={styles.historyTime}>{t('feelingsHistorySavedAt', { time: formatTimestamp(entry.timestamp, language) })}</Text>
              </View>
            );
          })}
          {history.length > 0 ? <Text style={styles.muted}>{`${Math.min(history.length, FEELINGS_HISTORY_LIMIT)}/${FEELINGS_HISTORY_LIMIT}`}</Text> : null}
          <AppButton label={t('feelingsDeleteHistory')} onPress={confirmDeleteHistory} variant="outline" disabled={history.length === 0} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  title: { ...typography.heading, color: colors.text, marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: 12 },
  statusBox: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderRadius: radii.lg, padding: 14, marginVertical: 8 },
  statusText: { fontSize: 20, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 8 },
  card: {
    width: '47%',
    margin: '1.5%',
    minHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.92 },
  cardLabel: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8, textAlign: 'center' },
  cardLabelSelected: { color: colors.white },
  selectedMark: { marginTop: 4, color: colors.white, fontWeight: '700', fontSize: 16 },
  responseBox: { marginTop: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.lg, padding: 14 },
  responseTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  responseText: { fontSize: 16, lineHeight: 24, color: colors.text, marginBottom: 10 },
  inlineActions: { flexDirection: 'row', gap: 8 },
  halfBtn: { flex: 1 },
  actionBox: { marginTop: 10, gap: 2 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 },
  actions: { marginTop: 8 },
  historySection: { marginTop: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 14 },
  sectionTitle: { ...typography.subheading, color: colors.text, marginBottom: 6 },
  latestText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  muted: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  historyItem: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10 },
  historyLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  historyTime: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
});
