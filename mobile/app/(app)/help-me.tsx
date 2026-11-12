import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { getSituations } from '../../src/services/api/situationApi';
import { ApiError } from '../../src/services/api/client';
import type { SituationSummary } from '../../src/types/situation';
import { colors, radii, typography } from '../../src/theme';

export default function HelpMeScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [situations, setSituations] = useState<SituationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'server' | 'cached' | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await getSituations();
      setSituations(res.data.situations || []);
      setSource('server');
      setLoadedAt(new Date());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('networkError'));
      if (situations.length) setSource('cached');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const titleFor = (s: SituationSummary) => {
    if (language === 'bn') return s.titleBn || s.titleEn || s.situationKey;
    return s.titleEn || s.titleBn || s.situationKey;
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <Text style={styles.title}>{t('helpMeTitle')}</Text>
        <Text style={styles.subtitle}>{t('chooseSituation')}</Text>
        <StatusMessage type="info" message={t('helpRequestWorkflowNote')} />

        {source === 'cached' ? <StatusMessage type="warning" message={t('staleData')} /> : null}
        {source === 'server' && loadedAt ? <Text style={styles.meta}>{t('sourceServer')}: {loadedAt.toLocaleTimeString()}</Text> : null}
        {error ? <StatusMessage type="error" message={error} /> : null}

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>{t('loadingSituations')}</Text></View>
        ) : null}

        {!loading && situations.length === 0 ? (
          <View>
            <StatusMessage type="info" message={t('noSituationsAvailable')} />
            <StatusMessage type="info" message={t('noSituationsHint')} />
          </View>
        ) : null}

        {!loading ? situations.map((s) => (
          <Pressable
            key={`${s.situationKey}-${s.careUserId ?? 'global'}`}
            onPress={() => router.push(`/(app)/situation/${encodeURIComponent(s.situationKey)}`)}
            accessibilityRole="button"
            accessibilityLabel={`${titleFor(s)}. ${s.stepCount} ${t('step')}`}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}><Ionicons name="help-buoy" size={24} color={colors.white} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{titleFor(s)}</Text>
                <Text style={styles.cardDesc}>{t('step')}: {s.stepCount} • {s.isPredefined ? 'Predefined' : 'Custom'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </View>
          </Pressable>
        )) : null}

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
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, padding: 14, marginBottom: 12 },
  pressed: { opacity: 0.95 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cardHelp, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.subheading, color: colors.text },
  cardDesc: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
});
