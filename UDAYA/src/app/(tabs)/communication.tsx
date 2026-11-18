import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { HeaderBar } from '@/components/HeaderBar';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Radius, Spacing, MaxContentWidth, MinTouchTarget } from '@/constants/theme';

interface AACCard {
  id: string;
  category: 'needs' | 'feelings' | 'actions' | 'people';
  word: string;
  nativeWord: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function SmartCommunicationScreen() {
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();
  const { t, speak, isSpeaking } = useLanguage();

  const [activeCategory, setActiveCategory] = useState<'all' | 'needs' | 'feelings' | 'actions'>('all');
  const [selectedWords, setSelectedWords] = useState<AACCard[]>([]);

  const AAC_CARDS: AACCard[] = [
    { id: '1', category: 'needs', word: 'Water', nativeWord: 'Water', icon: 'water', color: '#0284C7' },
    { id: '2', category: 'needs', word: 'Food', nativeWord: 'Food', icon: 'restaurant', color: '#D97706' },
    { id: '3', category: 'actions', word: 'Please', nativeWord: 'Please', icon: 'heart', color: '#EC4899' },
    { id: '4', category: 'needs', word: 'Help', nativeWord: 'Help', icon: 'help-buoy', color: '#DC2626' },
    { id: '5', category: 'needs', word: 'Bathroom', nativeWord: 'Bathroom', icon: 'body', color: '#7C3AED' },
    { id: '6', category: 'feelings', word: 'Happy', nativeWord: 'Happy', icon: 'happy', color: '#10B981' },
    { id: '7', category: 'feelings', word: 'Pain', nativeWord: 'Pain', icon: 'medkit', color: '#EF4444' },
    { id: '8', category: 'actions', word: 'Go Home', nativeWord: 'Go Home', icon: 'home', color: '#6366F1' },
    { id: '9', category: 'actions', word: 'Thank You', nativeWord: 'Thank You', icon: 'sparkles', color: '#0D9488' },
    { id: '10', category: 'feelings', word: 'Tired', nativeWord: 'Tired', icon: 'bed', color: '#8B5CF6' },
    { id: '11', category: 'actions', word: 'Yes', nativeWord: 'Yes', icon: 'checkmark-circle', color: '#059669' },
    { id: '12', category: 'actions', word: 'No', nativeWord: 'No', icon: 'close-circle', color: '#991B1B' },
  ];

  const handleAddWord = (card: AACCard) => {
    triggerHaptic('selection');
    setSelectedWords([...selectedWords, card]);
  };

  const handleRemoveLast = () => {
    triggerHaptic('selection');
    setSelectedWords(selectedWords.slice(0, -1));
  };

  const handleClear = () => {
    triggerHaptic('warning');
    setSelectedWords([]);
  };

  const constructedSentence = selectedWords.map((w) => w.word).join(' ');

  const handleSpeakSentence = () => {
    if (!constructedSentence) return;
    triggerHaptic('success');
    // If water + please -> "Please give me water."
    const words = selectedWords.map((w) => w.word.toLowerCase());
    let speechOutput = constructedSentence;

    if (words.includes('water') && words.includes('please')) {
      speechOutput = 'Please give me water.';
    } else if (words.includes('food') && words.includes('please')) {
      speechOutput = 'Please give me food.';
    } else if (words.includes('bathroom') && words.includes('help')) {
      speechOutput = 'I need help going to the bathroom.';
    } else if (words.includes('pain') && words.includes('help')) {
      speechOutput = 'I am in pain, please help me.';
    }

    speak(speechOutput);
  };

  const filteredCards =
    activeCategory === 'all'
      ? AAC_CARDS
      : AAC_CARDS.filter((c) => c.category === activeCategory);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isHighContrast ? '#000000' : theme.background },
      ]}>
      <HeaderBar showBack title={t('feature1Title')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          {/* Member 1 Presentation Banner */}
          <View
            style={[
              styles.presenterBanner,
              {
                backgroundColor: isHighContrast ? '#111111' : theme.featureCommSurface,
                borderColor: isHighContrast ? '#FFE600' : theme.featureComm,
              },
            ]}>
            <View style={styles.bannerRow}>
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: theme.featureComm },
                ]}>
                <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.presenterTitle,
                    { color: isHighContrast ? '#FFE600' : theme.featureComm },
                  ]}>
                  {t('feature1Presenter')}
                </Text>
                <Text
                  style={[
                    styles.presenterSub,
                    { color: isHighContrast ? '#FFFFFF' : theme.text },
                  ]}>
                  Augmentative & Alternative Communication (AAC)
                </Text>
              </View>
            </View>
          </View>

          {/* Sentence Builder Box */}
          <View
            style={[
              styles.sentenceBox,
              {
                backgroundColor: isHighContrast ? '#000000' : theme.card,
                borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                borderWidth: isHighContrast ? 2.5 : 1,
              },
            ]}>
            <View style={styles.sentenceHeader}>
              <Text
                style={[
                  styles.sentenceLabel,
                  { color: isHighContrast ? '#00FFFF' : theme.textSecondary },
                ]}>
                SENTENCE BUILDER
              </Text>

              <View style={styles.actionBtnRow}>
                {selectedWords.length > 0 && (
                  <>
                    <Pressable
                      onPress={handleRemoveLast}
                      accessibilityRole="button"
                      accessibilityLabel="Backspace last word"
                      style={({ pressed }) => [
                        styles.toolBtn,
                        {
                          backgroundColor: pressed ? theme.backgroundElement : 'transparent',
                          borderColor: theme.border,
                        },
                      ]}>
                      <Ionicons name="backspace-outline" size={18} color={theme.text} />
                    </Pressable>

                    <Pressable
                      onPress={handleClear}
                      accessibilityRole="button"
                      accessibilityLabel="Clear all words"
                      style={({ pressed }) => [
                        styles.toolBtn,
                        {
                          backgroundColor: pressed ? theme.backgroundElement : 'transparent',
                          borderColor: theme.border,
                        },
                      ]}>
                      <Ionicons name="trash-outline" size={18} color={theme.sos} />
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {/* Display Selected Tokens */}
            <View style={styles.tokensRow}>
              {selectedWords.length === 0 ? (
                <Text
                  style={[
                    styles.emptyHint,
                    { color: isHighContrast ? '#AAAAAA' : theme.textMuted },
                  ]}>
                  Tap picture cards below to construct an assistive sentence...
                </Text>
              ) : (
                selectedWords.map((card, idx) => (
                  <View
                    key={`${card.id}-${idx}`}
                    style={[
                      styles.wordChip,
                      {
                        backgroundColor: isHighContrast ? '#FFE600' : card.color,
                      },
                    ]}>
                    <Ionicons
                      name={card.icon}
                      size={14}
                      color={isHighContrast ? '#000000' : '#FFFFFF'}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isHighContrast ? '#000000' : '#FFFFFF' },
                      ]}>
                      {card.word}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Speak Sentence Button */}
            <AccessibleButton
              label={isSpeaking ? 'Speaking...' : 'Speak Sentence'}
              iconName="volume-high"
              onPress={handleSpeakSentence}
              variant="primary"
              disabled={selectedWords.length === 0}
              size="normal"
              fullWidth
              style={{ marginTop: Spacing.two }}
            />
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}>
            {[
              { id: 'all', label: 'All Cards' },
              { id: 'needs', label: 'Essential Needs' },
              { id: 'feelings', label: 'Feelings & Pain' },
              { id: 'actions', label: 'Social & Actions' },
            ].map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setActiveCategory(cat.id as any);
                }}
                accessibilityRole="button"
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor:
                      activeCategory === cat.id
                        ? isHighContrast
                          ? '#FFE600'
                          : theme.featureComm
                        : isHighContrast
                        ? '#1A1A1A'
                        : theme.card,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                  },
                ]}>
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color:
                        activeCategory === cat.id
                          ? isHighContrast
                            ? '#000000'
                            : '#FFFFFF'
                          : theme.text,
                      fontWeight: activeCategory === cat.id ? '800' : '600',
                    },
                  ]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* AAC Picture Grid */}
          <View style={styles.gridContainer}>
            {filteredCards.map((card) => (
              <Pressable
                key={card.id}
                onPress={() => handleAddWord(card)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${card.word} to sentence`}
                style={({ pressed }) => [
                  styles.aacCard,
                  {
                    backgroundColor: isHighContrast ? '#000000' : theme.card,
                    borderColor: isHighContrast ? '#FFE600' : theme.cardBorder,
                    borderWidth: isHighContrast ? 2.5 : 1,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.aacIconBox,
                    {
                      backgroundColor: isHighContrast ? '#1A1A1A' : `${card.color}15`,
                      borderColor: card.color,
                    },
                  ]}>
                  <Ionicons
                    name={card.icon}
                    size={28}
                    color={isHighContrast ? '#FFE600' : card.color}
                  />
                </View>

                <Text
                  style={[
                    styles.aacText,
                    {
                      color: theme.text,
                      fontSize: 14 * fontScale,
                    },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                  ]}>
                  {card.word}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  mainContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  presenterBanner: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1.5,
    marginBottom: Spacing.three,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenterTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  presenterSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  sentenceBox: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  sentenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sentenceLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 48,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  emptyHint: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: Spacing.two,
  },
  categoryPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  categoryPillText: {
    fontSize: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  aacCard: {
    width: '31%',
    flexGrow: 1,
    minWidth: 100,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinTouchTarget + 40,
  },
  aacIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  aacText: {
    textAlign: 'center',
  },
});
