import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { HeaderBar } from '@/components/HeaderBar';
import { EmergencySosBanner } from '@/components/EmergencySosBanner';
import { FeatureHeroCard } from '@/components/FeatureHeroCard';
import { QuickToolCard } from '@/components/QuickToolCard';
import { Radius, Spacing, MaxContentWidth, MinTouchTarget } from '@/constants/theme';

export default function HomeDashboard() {
  const router = useRouter();
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();
  const { t, currentLanguage } = useLanguage();

  // Time-based personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetingMorning');
    if (hour < 17) return t('greetingAfternoon');
    return t('greetingEvening');
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isHighContrast ? '#000000' : theme.background },
      ]}>
      {/* Top Header with Language Pill & High-Contrast Toggle */}
      <HeaderBar title="UDAYA" subtitle={t('tagline')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          {/* Welcome Greeting Card */}
          <View
            style={[
              styles.greetingCard,
              {
                backgroundColor: isHighContrast ? '#000000' : theme.card,
                borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                borderWidth: isHighContrast ? 2 : 1,
              },
            ]}>
            <View style={styles.greetingTop}>
              <View>
                <Text
                  style={[
                    styles.greetingTitle,
                    {
                      color: theme.text,
                      fontSize: 22 * fontScale,
                    },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '900' },
                  ]}>
                  {getGreeting()} 👋
                </Text>
                <Text
                  style={[
                    styles.greetingSub,
                    {
                      color: theme.textSecondary,
                      fontSize: 13 * fontScale,
                    },
                    isHighContrast && { color: '#FFE600' },
                  ]}>
                  {t('dashboardSubtitle')}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  router.push('/language-select' as any);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Language selector. Active language is ${currentLanguage.name}`}
                style={({ pressed }) => [
                  styles.activeLangChip,
                  {
                    backgroundColor: isHighContrast
                      ? '#1A1A1A'
                      : pressed
                      ? theme.backgroundElement
                      : theme.primarySurface,
                    borderColor: isHighContrast ? '#FFE600' : theme.primary,
                  },
                ]}>
                <Ionicons
                  name="language"
                  size={14}
                  color={isHighContrast ? '#FFE600' : theme.primary}
                />
                <Text
                  style={[
                    styles.activeLangText,
                    { color: isHighContrast ? '#FFE600' : theme.primary },
                  ]}>
                  {currentLanguage.nativeName}
                </Text>
              </Pressable>
            </View>

            {/* Quick Today's Routine Snapshot */}
            <View
              style={[
                styles.routineSnapshot,
                {
                  backgroundColor: isHighContrast ? '#111111' : theme.featureRoutineSurface,
                  borderColor: isHighContrast ? '#FFE600' : theme.featureRoutine,
                },
              ]}>
              <View style={styles.snapshotHeader}>
                <View style={styles.snapshotTitleRow}>
                  <Ionicons
                    name="checkbox-outline"
                    size={16}
                    color={isHighContrast ? '#FFE600' : theme.featureRoutine}
                  />
                  <Text
                    style={[
                      styles.snapshotTitle,
                      { color: isHighContrast ? '#FFE600' : theme.featureRoutine },
                    ]}>
                    {t('todayRoutineProgress')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.snapshotCount,
                    { color: isHighContrast ? '#FFFFFF' : theme.text },
                  ]}>
                  3 / 4 {t('tasksCompleted')} (75%)
                </Text>
              </View>

              {/* Progress bar */}
              <View
                style={[
                  styles.progressBarBg,
                  {
                    backgroundColor: isHighContrast ? '#333333' : '#E2E8F0',
                  },
                ]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: '75%',
                      backgroundColor: isHighContrast ? '#FFE600' : theme.featureRoutine,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Emergency SOS Banner (Urgent Accessibility Shortcut) */}
          <EmergencySosBanner />

          {/* Four Core Features Section (Presented by 4 Team Members) */}
          <View style={styles.sectionHeader}>
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.text,
                    fontSize: 18 * fontScale,
                  },
                  isHighContrast && { color: '#FFFFFF', fontWeight: '900' },
                ]}>
                {t('fourCoreFeatures')}
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: theme.textSecondary },
                  isHighContrast && { color: '#00FFFF' },
                ]}>
                {t('fourCoreDescription')}
              </Text>
            </View>
          </View>

          {/* Member 1: Smart Communication */}
          <FeatureHeroCard
            memberBadge={t('feature1Presenter')}
            categoryTag={t('feature1Tag')}
            title={t('feature1Title')}
            subtitle={t('feature1Subtitle')}
            iconName="chatbubbles"
            accentColor={theme.featureComm}
            surfaceColor={theme.featureCommSurface}
            overviewSummary="Picture-based communication cards with AAC sentence builder and speech synthesis for non-speaking users."
            onPress={() => router.push('/(tabs)/communication' as any)}
          />

          {/* Member 2: Vision Assistance */}
          <FeatureHeroCard
            memberBadge={t('feature2Presenter')}
            categoryTag={t('feature2Tag')}
            title={t('feature2Title')}
            subtitle={t('feature2Subtitle')}
            iconName="eye"
            accentColor={theme.featureVision}
            surfaceColor={theme.featureVisionSurface}
            overviewSummary="Live camera scene descriptor, object recognition and optical character reader with audio speech."
            onPress={() => router.push('/(tabs)/vision' as any)}
          />

          {/* Member 3: Hearing Assistance */}
          <FeatureHeroCard
            memberBadge={t('feature3Presenter')}
            categoryTag={t('feature3Tag')}
            title={t('feature3Title')}
            subtitle={t('feature3Subtitle')}
            iconName="ear"
            accentColor={theme.featureHearing}
            surfaceColor={theme.featureHearingSurface}
            overviewSummary="Real-time speech-to-text captions and vital environmental sound alert detection for sirens, alarms and bells."
            onPress={() => router.push('/(tabs)/hearing' as any)}
          />

          {/* Member 4: Smart Daily Routine */}
          <FeatureHeroCard
            memberBadge={t('feature4Presenter')}
            categoryTag={t('feature4Tag')}
            title={t('feature4Title')}
            subtitle={t('feature4Subtitle')}
            iconName="calendar"
            accentColor={theme.featureRoutine}
            surfaceColor={theme.featureRoutineSurface}
            overviewSummary="Step-by-step visual daily activity manager organized from morning to night with task progress tracking."
            onPress={() => router.push('/(tabs)/routine' as any)}
          />

          {/* Specialized Additional Tools Section */}
          <View style={[styles.sectionHeader, { marginTop: Spacing.four }]}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.text,
                  fontSize: 18 * fontScale,
                },
                isHighContrast && { color: '#FFFFFF', fontWeight: '900' },
              ]}>
              {t('additionalTools')}
            </Text>
          </View>

          <View style={styles.quickToolsGrid}>
            <View style={styles.quickToolsRow}>
              <QuickToolCard
                title={t('toolMedicine')}
                description={t('toolMedicineDesc')}
                iconName="medical"
                color="#EF4444"
                onPress={() => router.push('/(tabs)/settings' as any)}
              />
              <QuickToolCard
                title={t('toolEmotion')}
                description={t('toolEmotionDesc')}
                iconName="heart"
                color="#EC4899"
                onPress={() => router.push('/(tabs)/communication' as any)}
              />
            </View>

            <View style={styles.quickToolsRow}>
              <QuickToolCard
                title={t('toolLearning')}
                description={t('toolLearningDesc')}
                iconName="book"
                color="#8B5CF6"
                onPress={() => router.push('/(tabs)/settings' as any)}
              />
              <QuickToolCard
                title={t('toolCaregiver')}
                description={t('toolCaregiverDesc')}
                iconName="shield-checkmark"
                color="#0D9488"
                onPress={() => router.push('/(tabs)/settings' as any)}
              />
            </View>
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
    paddingTop: Spacing.two,
  },
  greetingCard: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.two,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  greetingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  greetingTitle: {
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  greetingSub: {
    fontWeight: '500',
    marginTop: 2,
  },
  activeLangChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  activeLangText: {
    fontSize: 12,
    fontWeight: '700',
  },
  routineSnapshot: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1,
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  snapshotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  snapshotTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  snapshotCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionHeader: {
    marginVertical: Spacing.two,
  },
  sectionTitle: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  quickToolsGrid: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  quickToolsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
