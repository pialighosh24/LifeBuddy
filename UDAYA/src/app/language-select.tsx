import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { SUPPORTED_LANGUAGES, LanguageItem } from '@/localization/languages';
import { TRANSLATIONS } from '@/localization/translations';
import { LanguageCard } from '@/components/LanguageCard';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Radius, Spacing, MaxContentWidth, MinTouchTarget } from '@/constants/theme';

export default function LanguageSelectScreen() {
  const router = useRouter();
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();
  const { currentLanguage, setLanguage, speak, stopSpeaking } = useLanguage();

  const [selectedLangId, setSelectedLangId] = useState<string>(currentLanguage.id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const selectedItem: LanguageItem =
    SUPPORTED_LANGUAGES.find((l) => l.id === selectedLangId) || currentLanguage;

  // Active translation dictionary for live preview
  const previewDict = TRANSLATIONS[selectedLangId] || TRANSLATIONS.en;

  const handleSelectLanguage = (lang: LanguageItem) => {
    setSelectedLangId(lang.id);
  };

  const handlePlayVoiceSample = async (lang: LanguageItem) => {
    if (playingId === lang.id) {
      await stopSpeaking();
      setPlayingId(null);
    } else {
      setPlayingId(lang.id);
      await speak(lang.greeting, lang.code);
      setTimeout(() => setPlayingId(null), 3500);
    }
  };

  const handleConfirmAndContinue = async () => {
    await stopSpeaking();
    triggerHaptic('success');
    await setLanguage(selectedLangId);
    // Navigate to Home Dashboard
    router.replace('/(tabs)' as any);
  };

  const filteredLanguages = SUPPORTED_LANGUAGES.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.nativeName.toLowerCase().includes(query) ||
      item.subLabel.toLowerCase().includes(query)
    );
  });

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isHighContrast ? '#000000' : theme.background },
      ]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.card,
            borderBottomColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
            borderBottomWidth: isHighContrast ? 2 : 1,
          },
        ]}>
        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/welcome' as any);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back to welcome"
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: pressed ? theme.backgroundElement : 'transparent',
              borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
            },
          ]}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={isHighContrast ? '#FFE600' : theme.text}
          />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.text },
              isHighContrast && { color: '#FFFFFF', fontWeight: '900' },
            ]}>
            {previewDict.chooseLanguageTitle}
          </Text>
          <Text
            style={[
              styles.headerSub,
              { color: theme.textSecondary },
              isHighContrast && { color: '#FFE600' },
            ]}>
            {previewDict.chooseLanguageSubtitle}
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Search Box */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isHighContrast ? '#111111' : theme.card,
                borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                borderWidth: isHighContrast ? 2 : 1,
              },
            ]}>
            <Ionicons
              name="search"
              size={20}
              color={isHighContrast ? '#FFE600' : theme.textMuted}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={previewDict.searchLanguages}
              placeholderTextColor={isHighContrast ? '#AAAAAA' : theme.textMuted}
              accessibilityLabel="Search language or script"
              style={[
                styles.searchInput,
                {
                  color: theme.text,
                  fontSize: 15 * fontScale,
                },
                isHighContrast && { color: '#FFFFFF' },
              ]}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search text">
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={isHighContrast ? '#FFE600' : theme.textMuted}
                />
              </Pressable>
            )}
          </View>

          {/* Accessibility Hint */}
          <View
            style={[
              styles.infoPill,
              {
                backgroundColor: isHighContrast ? '#111111' : theme.primarySurface,
                borderColor: isHighContrast ? '#00FFFF' : theme.primary,
              },
            ]}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={isHighContrast ? '#00FFFF' : theme.primary}
            />
            <Text
              style={[
                styles.infoText,
                { color: isHighContrast ? '#00FFFF' : theme.primary },
              ]}>
              {previewDict.languageHint}
            </Text>
          </View>

          {/* Languages List */}
          <View style={styles.listContainer}>
            {filteredLanguages.map((lang) => (
              <LanguageCard
                key={lang.id}
                language={lang}
                isSelected={selectedLangId === lang.id}
                onSelect={() => handleSelectLanguage(lang)}
                onPlaySample={() => handlePlayVoiceSample(lang)}
                isPlayingSample={playingId === lang.id}
              />
            ))}
          </View>

          {/* Live Interface Preview Section */}
          <View
            style={[
              styles.previewBox,
              {
                backgroundColor: isHighContrast ? '#000000' : theme.card,
                borderColor: isHighContrast ? '#FFE600' : theme.primary,
                borderWidth: isHighContrast ? 2.5 : 1.5,
              },
            ]}>
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewTitleWithIcon}>
                <Ionicons
                  name="sparkles"
                  size={18}
                  color={isHighContrast ? '#FFE600' : theme.accent}
                />
                <Text
                  style={[
                    styles.previewTitle,
                    { color: isHighContrast ? '#FFE600' : theme.primary },
                  ]}>
                  {previewDict.previewHeader}
                </Text>
              </View>

              <View
                style={[
                  styles.activeTag,
                  { backgroundColor: isHighContrast ? '#FFE600' : theme.primary },
                ]}>
                <Text
                  style={[
                    styles.activeTagText,
                    { color: isHighContrast ? '#000000' : '#FFFFFF' },
                  ]}>
                  {selectedItem.nativeName}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.sampleCard,
                {
                  backgroundColor: isHighContrast ? '#111111' : theme.backgroundElement,
                  borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                },
              ]}>
              <View style={styles.sampleTop}>
                <Ionicons
                  name="chatbubbles"
                  size={20}
                  color={isHighContrast ? '#FFE600' : theme.featureComm}
                />
                <Text
                  style={[
                    styles.sampleLabel,
                    { color: theme.text },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                  ]}>
                  {previewDict.feature1Title}
                </Text>
              </View>

              <Text
                style={[
                  styles.sampleBody,
                  { color: theme.textSecondary },
                  isHighContrast && { color: '#FFE600' },
                ]}>
                {previewDict.previewText}
              </Text>

              {/* Sample Voice Trigger */}
              <Pressable
                onPress={() => handlePlayVoiceSample(selectedItem)}
                accessibilityRole="button"
                accessibilityLabel="Hear voice guidance in this selected language"
                style={({ pressed }) => [
                  styles.sampleAudioBtn,
                  {
                    backgroundColor: isHighContrast
                      ? '#FFE600'
                      : pressed
                      ? theme.primaryHover
                      : theme.primary,
                  },
                ]}>
                <Ionicons
                  name={playingId === selectedItem.id ? 'stop' : 'volume-high'}
                  size={16}
                  color={isHighContrast ? '#000000' : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.sampleAudioText,
                    { color: isHighContrast ? '#000000' : '#FFFFFF' },
                  ]}>
                  {previewDict.listenVoiceSample}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Continue Button */}
      <View
        style={[
          styles.bottomContainer,
          {
            backgroundColor: theme.card,
            borderTopColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
            borderTopWidth: isHighContrast ? 2 : 1,
          },
        ]}>
        <AccessibleButton
          label={`${previewDict.confirmLanguage} (${selectedItem.nativeName})`}
          onPress={handleConfirmAndContinue}
          variant="primary"
          iconName="checkmark-circle"
          size="large"
          fullWidth
          accessibilityHint="Confirms language and opens the Udaya Home Dashboard"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 110,
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.full,
    height: MinTouchTarget,
    gap: 8,
    marginBottom: Spacing.three,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontWeight: '600',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  listContainer: {
    marginBottom: Spacing.four,
  },
  previewBox: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginVertical: Spacing.three,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  previewTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  activeTag: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sampleCard: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
  },
  sampleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sampleLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  sampleBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.three,
    fontWeight: '500',
  },
  sampleAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    minHeight: 38,
  },
  sampleAudioText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    alignItems: 'center',
  },
});
