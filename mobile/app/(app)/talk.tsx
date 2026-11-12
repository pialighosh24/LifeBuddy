import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { AppTextInput } from '../../src/components/AppTextInput';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { getCommunicationCategories, getCommunicationItems } from '../../src/services/api/communicationApi';
import { addFavourite, getFavourites, removeFavourite } from '../../src/services/api/favouritesApi';
import { speakText, stopSpeaking } from '../../src/services/speech/tts';
import { ApiError, getValidationMessages } from '../../src/services/api/client';
import { buildSentenceText, getItemLabel, type SentenceToken } from '../../src/utils/sentence';
import type { CommunicationCategory, CommunicationItem, FavouritePhrase } from '../../src/types/communication';
import { colors, radii, typography } from '../../src/theme';

function iconForItem(item: CommunicationItem): keyof typeof Ionicons.glyphMap {
  const key = `${item.iconKey || ''} ${item.itemKey || ''} ${item.category || ''}`.toLowerCase();
  if (key.includes('water') || key.includes('drink') || key.includes('thirst')) return 'water';
  if (key.includes('food') || key.includes('eat') || key.includes('hungry')) return 'restaurant';
  if (key.includes('toilet') || key.includes('bath')) return 'male-female';
  if (key.includes('pain') || key.includes('hurt')) return 'medkit';
  if (key.includes('help')) return 'hand-left';
  if (key.includes('sleep') || key.includes('tired')) return 'bed';
  if (key.includes('yes')) return 'checkmark-circle';
  if (key.includes('no')) return 'close-circle';
  if (key.includes('happy')) return 'happy';
  if (key.includes('sad')) return 'sad';
  if (key.includes('feel')) return 'heart';
  return 'chatbubble-ellipses';
}

let tokenSeq = 0;

export default function TalkScreen() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [categories, setCategories] = useState<CommunicationCategory[]>([]);
  const [favourites, setFavourites] = useState<FavouritePhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [favLoading, setFavLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favError, setFavError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sentenceTokens, setSentenceTokens] = useState<SentenceToken[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [favBusy, setFavBusy] = useState<number | 'add' | null>(null);
  const [dataSource, setDataSource] = useState<'fresh' | 'cached' | null>(null);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);

  const isCareUser = user?.role === 'user';
  const careUserId = isCareUser ? user?.id : null;

  const loadCommunication = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        getCommunicationItems({ active: 'true' }),
        getCommunicationCategories(),
      ]);
      setItems(itemsRes.data.items || []);
      setCategories(catsRes.data.categories || []);
      setDataSource('fresh');
      setCachedAt(new Date());
    } catch (e) {
      const msg = e instanceof ApiError ? (getValidationMessages(e.details) || e.message) : t('networkError');
      setError(msg);
      // keep previously loaded items as in-memory cache if available
      if (items.length > 0) {
        setDataSource('cached');
      } else {
        setDataSource(null);
      }
    } finally {
      setLoading(false);
    }
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFavourites = useCallback(async () => {
    if (!careUserId) return;
    setFavLoading(true);
    setFavError(null);
    try {
      const res = await getFavourites(careUserId);
      setFavourites(res.data.favourites || []);
    } catch (e) {
      if (e instanceof ApiError) {
        setFavError(getValidationMessages(e.details) || e.message);
      } else {
        setFavError(t('networkError'));
      }
    } finally {
      setFavLoading(false);
    }
  }, [careUserId, t]);

  useEffect(() => { loadCommunication(); }, [loadCommunication]);
  useEffect(() => { if (careUserId) loadFavourites(); }, [careUserId, loadFavourites]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (!q) return true;
      const hay = `${item.labelEn} ${item.labelBn || ''} ${item.speakTextEn} ${item.speakTextBn || ''} ${item.category} ${item.itemKey}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, selectedCategory, search]);

  const sentenceText = useMemo(() => buildSentenceText(sentenceTokens, language), [sentenceTokens, language]);

  const onSelectItem = (item: CommunicationItem) => {
    tokenSeq += 1;
    setSentenceTokens(prev => [...prev, { key: `${item.id}-${tokenSeq}`, item }]);
    setInfo(null);
  };

  const onRemoveToken = (key: string) => {
    setSentenceTokens(prev => prev.filter(tk => tk.key !== key));
  };

  const onClearSentence = async () => {
    await stopSpeaking().catch(() => {});
    setSpeaking(false);
    setSentenceTokens([]);
    setSpeechError(null);
  };

  const doSpeak = async () => {
    if (!sentenceText) return;
    setSpeechError(null);
    try {
      setSpeaking(true);
      await speakText(sentenceText, language);
    } catch {
      setSpeechError(t('ttsUnavailable'));
    } finally {
      setSpeaking(false);
    }
  };

  const onStop = async () => {
    await stopSpeaking().catch(() => {});
    setSpeaking(false);
  };

  const onSaveFavourite = async () => {
    if (!careUserId || !sentenceText || sentenceTokens.length === 0) return;
    setFavBusy('add');
    setFavError(null);
    setInfo(null);
    try {
      const phraseEn = buildSentenceText(sentenceTokens, 'en');
      const phraseBn = buildSentenceText(sentenceTokens, 'bn');
      const selectedItemKeys = sentenceTokens.map(tk => tk.item.itemKey);
      const res = await addFavourite(careUserId, {
        phraseEn: phraseEn || sentenceText,
        phraseBn: phraseBn || null,
        selectedItemKeys,
        phraseLabel: (getItemLabel(sentenceTokens[0].item, language) || 'Favourite').slice(0, 120),
      });
      const fav = res.data.favourite;
      setFavourites(prev => [fav, ...prev.filter(f => f.id !== fav.id)]);
      setInfo(t('addedFavourite'));
    } catch (e) {
      if (e instanceof ApiError) setFavError(getValidationMessages(e.details) || e.message);
      else setFavError(t('networkError'));
    } finally {
      setFavBusy(null);
    }
  };

  const onRemoveFavourite = async (favId: number) => {
    setFavBusy(favId);
    setFavError(null);
    setInfo(null);
    try {
      await removeFavourite(favId);
      setFavourites(prev => prev.filter(f => f.id !== favId));
      setInfo(t('removedFavourite'));
    } catch (e) {
      if (e instanceof ApiError) setFavError(getValidationMessages(e.details) || e.message);
      else setFavError(t('networkError'));
    } finally {
      setFavBusy(null);
    }
  };

  const speakFavourite = async (fav: FavouritePhrase) => {
    const text = (language === 'bn' ? (fav.phraseBn || fav.phraseEn) : (fav.phraseEn || fav.phraseBn)) || '';
    if (!text.trim()) return;
    setSpeechError(null);
    try {
      setSpeaking(true);
      await speakText(text, language);
    } catch {
      setSpeechError(t('ttsUnavailable'));
    } finally {
      setSpeaking(false);
    }
  };

  const loadFavouriteToSentence = (fav: FavouritePhrase) => {
    // Best-effort: rebuild tokens from selectedItemKeys if items are available; otherwise keep as non-editable info
    const keys = fav.selectedItemKeys || [];
    if (keys.length && items.length) {
      const byKey = new Map(items.map(i => [i.itemKey, i]));
      const rebuilt: SentenceToken[] = [];
      for (const k of keys) {
        const item = byKey.get(k);
        if (item) {
          tokenSeq += 1;
          rebuilt.push({ key: `${item.id}-${tokenSeq}`, item });
        }
      }
      if (rebuilt.length) {
        setSentenceTokens(rebuilt);
        setInfo(null);
        return;
      }
    }
    setInfo(language === 'bn' ? (fav.phraseBn || fav.phraseEn) : (fav.phraseEn || fav.phraseBn || ''));
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('talkTitle')}</Text>
      <Text style={styles.subtitle}>{t('talkSubtitle')}</Text>

      {dataSource === 'cached' ? (
        <StatusMessage type="warning" message={`Showing previously loaded (cached) communication data from this session${cachedAt ? ` (${cachedAt.toLocaleTimeString()})` : ''}. Latest server data could not be refreshed.`} />
      ) : null}
      {dataSource === 'fresh' && cachedAt ? (
        <Text style={styles.meta}>Loaded from server: {cachedAt.toLocaleTimeString()}</Text>
      ) : null}

      {error ? <StatusMessage type="error" message={error} /> : null}
      {speechError ? <StatusMessage type="error" message={speechError} /> : null}
      {info ? <StatusMessage type="success" message={info} /> : null}

      <View style={styles.sentenceBox} accessibilityLabel={t('sentence')}>
        <Text style={styles.sectionLabel}>{t('sentence')}</Text>
        {sentenceTokens.length === 0 ? (
          <Text style={styles.emptySentence}>{t('sentenceEmpty')}</Text>
        ) : (
          <View>
            <View style={styles.tokenWrap}>
              {sentenceTokens.map((tk) => (
                <Pressable
                  key={tk.key}
                  onPress={() => onRemoveToken(tk.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${getItemLabel(tk.item, language)} from sentence`}
                  style={styles.token}
                >
                  <Text style={styles.tokenText}>{getItemLabel(tk.item, language)}</Text>
                  <Ionicons name="close" size={16} color={colors.white} />
                </Pressable>
              ))}
            </View>
            <Text style={styles.sentenceText}>{sentenceText}</Text>
          </View>
        )}
        <View style={styles.controlsRow}>
          <AppButton label={t('speak')} onPress={doSpeak} disabled={!sentenceText || speaking} style={styles.controlBtn} />
          <AppButton label={t('replay')} onPress={doSpeak} variant="secondary" disabled={!sentenceText || speaking} style={styles.controlBtn} />
        </View>
        <View style={styles.controlsRow}>
          <AppButton label={t('stop')} onPress={onStop} variant="outline" disabled={!speaking} style={styles.controlBtn} />
          <AppButton label={t('clear')} onPress={onClearSentence} variant="outline" disabled={sentenceTokens.length === 0 && !speaking} style={styles.controlBtn} />
        </View>
        {isCareUser ? (
          <AppButton
            label={t('addFavourite')}
            onPress={onSaveFavourite}
            variant="secondary"
            disabled={!sentenceText || favBusy === 'add'}
            loading={favBusy === 'add'}
            accessibilityLabel={t('addFavourite')}
          />
        ) : (
          <StatusMessage type="info" message={t('favouritesCareUserOnly')} />
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>{t('favourites')}</Text>
          {isCareUser ? <AppButton label={t('retryAction')} onPress={loadFavourites} variant="outline" style={styles.smallBtn} disabled={favLoading} /> : null}
        </View>
        {isCareUser ? (
          <>
            {favError ? <StatusMessage type="error" message={favError} /> : null}
            {favLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {!favLoading && favourites.length === 0 ? <Text style={styles.muted}>{t('noFavourites')}</Text> : null}
            {favourites.map(fav => (
              <View key={fav.id} style={styles.favCard}>
                <Text style={styles.favText}>{language === 'bn' ? (fav.phraseBn || fav.phraseEn) : (fav.phraseEn || fav.phraseBn)}</Text>
                <View style={styles.favActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Speak favourite ${fav.id}`} onPress={() => speakFavourite(fav)} style={styles.iconBtn}><Ionicons name="volume-high" size={22} color={colors.primary} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Load favourite ${fav.id}`} onPress={() => loadFavouriteToSentence(fav)} style={styles.iconBtn}><Ionicons name="arrow-up-circle" size={22} color={colors.secondary} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={t('removeFavourite')} onPress={() => onRemoveFavourite(fav.id)} disabled={favBusy === fav.id} style={styles.iconBtn}>
                    {favBusy === fav.id ? <ActivityIndicator size="small" color={colors.danger} /> : <Ionicons name="trash" size={22} color={colors.danger} />}
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.muted}>{t('favouritesCareUserOnly')}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>{t('categories')}</Text>
          <AppButton label={t('retryAction')} onPress={loadCommunication} variant="outline" style={styles.smallBtn} disabled={loading} />
        </View>
        {loading ? <ActivityIndicator color={colors.primary} accessibilityLabel={t('loading')} /> : null}

        <AppTextInput label={t('search')} value={search} onChangeText={setSearch} placeholder={t('searchPlaceholder')} accessibilityLabel={t('search')} />

        <View style={styles.catWrap}>
          <Pressable onPress={() => setSelectedCategory('all')} accessibilityRole="button" accessibilityState={{ selected: selectedCategory === 'all' }} style={[styles.catChip, selectedCategory === 'all' && styles.catChipActive]}>
            <Text style={[styles.catChipText, selectedCategory === 'all' && styles.catChipTextActive]}>{t('all')}</Text>
          </Pressable>
          {categories.map(c => (
            <Pressable key={c.category} onPress={() => setSelectedCategory(c.category)} accessibilityRole="button" accessibilityState={{ selected: selectedCategory === c.category }} style={[styles.catChip, selectedCategory === c.category && styles.catChipActive]}>
              <Text style={[styles.catChipText, selectedCategory === c.category && styles.catChipTextActive]}>{c.category} ({c.itemCount})</Text>
            </Pressable>
          ))}
        </View>

        {!loading && items.length === 0 ? (
          <View>
            <StatusMessage type="info" message={t('noItems')} />
            <StatusMessage type="warning" message={t('noItemsHint')} />
          </View>
        ) : null}

        {!loading && items.length > 0 && filteredItems.length === 0 ? (
          <StatusMessage type="info" message="No items match the current filter/search." />
        ) : null}

        <View style={styles.grid}>
          {filteredItems.map(item => {
            const label = getItemLabel(item, language);
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelectItem(item)}
                accessibilityRole="button"
                accessibilityLabel={`${label}. ${item.category}`}
                style={({ pressed }) => [styles.itemTile, pressed && styles.pressed]}
              >
                <View style={styles.itemIcon}><Ionicons name={iconForItem(item)} size={28} color={colors.primary} /></View>
                <Text style={styles.itemLabel}>{label}</Text>
                {language === 'bn' && !item.labelBn ? <Text style={styles.itemHint}>EN label</Text> : null}
                {language === 'en' && item.labelBn ? <Text style={styles.itemHint}>বাংলা available</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <StatusMessage type="info" message={t('ttsLangUnavailable')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text, marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: 12 },
  meta: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  sentenceBox: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, borderRadius: radii.lg, padding: 14, marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionLabel: { ...typography.subheading, color: colors.text, marginBottom: 8 },
  emptySentence: { color: colors.textMuted, fontSize: 16, marginBottom: 8 },
  tokenWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  token: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radii.pill },
  tokenText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  sentenceText: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  controlsRow: { flexDirection: 'row', gap: 8 },
  controlBtn: { flex: 1 },
  smallBtn: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 12, marginVertical: 0 },
  muted: { color: colors.textMuted, fontSize: 15 },
  favCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 12, marginBottom: 8 },
  favText: { fontSize: 16, color: colors.text, fontWeight: '600', marginBottom: 8 },
  favActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  catChip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white },
  catChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  catChipText: { color: colors.text, fontWeight: '600' },
  catChipTextActive: { color: colors.primaryDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  itemTile: { width: '47%', margin: '1.5%', minHeight: 110, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.lg, padding: 10, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.9, borderColor: colors.primary },
  itemIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  itemLabel: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  itemHint: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
});
