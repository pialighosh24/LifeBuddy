import React, { useState } from 'react';
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
import { UdayaLogo } from '@/components/UdayaLogo';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Radius, Spacing, MaxContentWidth, MinTouchTarget } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme, isHighContrast, toggleHighContrast, triggerHaptic, fontScale } = useAccessibility();
  const { t, speak, stopSpeaking, isSpeaking } = useLanguage();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleGetStarted = () => {
    stopSpeaking();
    triggerHaptic('selection');
    // Flow: Welcome Screen -> Language Selection Page -> Home Dashboard
    router.push('/language-select' as any);
  };

  const handleToggleVoiceIntro = async () => {
    triggerHaptic('selection');
    if (isPlayingAudio || isSpeaking) {
      await stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      await speak(
        `${t('welcomeTitle')}. ${t('welcomeSubtitle')}. ${t('welcomeDescription')}. ${t('tagline')}`
      );
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isHighContrast ? '#000000' : theme.background },
      ]}>
      {/* Top Header Utilities */}
      <View style={styles.topBar}>
        <View style={styles.collegeBadge}>
          <Ionicons
            name="school-outline"
            size={14}
            color={isHighContrast ? '#FFE600' : theme.primary}
          />
          <Text
            style={[
              styles.collegeText,
              { color: isHighContrast ? '#FFE600' : theme.primary },
            ]}>
            BCA Final Year Project
          </Text>
        </View>

        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            toggleHighContrast();
          }}
          accessibilityRole="button"
          accessibilityLabel="Toggle High Contrast Mode"
          style={({ pressed }) => [
            styles.contrastPill,
            {
              backgroundColor: isHighContrast
                ? '#FFE600'
                : pressed
                ? theme.backgroundElement
                : theme.card,
              borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
            },
          ]}>
          <Ionicons
            name={isHighContrast ? 'contrast' : 'contrast-outline'}
            size={18}
            color={isHighContrast ? '#000000' : theme.text}
          />
          <Text
            style={[
              styles.contrastPillText,
              { color: isHighContrast ? '#000000' : theme.text },
            ]}>
            {isHighContrast ? 'Standard' : 'Contrast'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          {/* Logo & Dawn Branding */}
          <View style={styles.logoSection}>
            <UdayaLogo size="large" showTagline />
          </View>

          {/* Subtitle & Introduction */}
          <View style={styles.introSection}>
            <Text
              style={[
                styles.subtitle,
                {
                  color: isHighContrast ? '#00FFFF' : theme.primary,
                  fontSize: 18 * fontScale,
                },
              ]}>
              {t('welcomeSubtitle')}
            </Text>

            <Text
              style={[
                styles.description,
                {
                  color: isHighContrast ? '#FFFFFF' : theme.textSecondary,
                  fontSize: 14 * fontScale,
                },
              ]}>
              {t('welcomeDescription')}
            </Text>

            {/* Listen Welcome Button for Visual Accessibility */}
            <Pressable
              onPress={handleToggleVoiceIntro}
              accessibilityRole="button"
              accessibilityLabel="Listen to application spoken introduction"
              style={({ pressed }) => [
                styles.voiceButton,
                {
                  backgroundColor: isHighContrast
                    ? isPlayingAudio
                      ? '#FFE600'
                      : '#1A1A1A'
                    : isPlayingAudio
                    ? theme.primary
                    : theme.primarySurface,
                  borderColor: isHighContrast ? '#FFE600' : theme.primary,
                },
              ]}>
              <Ionicons
                name={isPlayingAudio ? 'stop-circle' : 'volume-high'}
                size={20}
                color={
                  isHighContrast
                    ? isPlayingAudio
                      ? '#000000'
                      : '#FFE600'
                    : isPlayingAudio
                    ? '#FFFFFF'
                    : theme.primary
                }
              />
              <Text
                style={[
                  styles.voiceButtonText,
                  {
                    color:
                      isHighContrast
                        ? isPlayingAudio
                          ? '#000000'
                          : '#FFE600'
                        : isPlayingAudio
                        ? '#FFFFFF'
                        : theme.primary,
                  },
                ]}>
                {isPlayingAudio ? t('stopAudio') : t('listenWelcome')}
              </Text>
            </Pressable>
          </View>

          {/* Four Core Pillars Highlights */}
          <View style={styles.pillarsContainer}>
            <Text
              style={[
                styles.pillarsHeading,
                { color: theme.text },
                isHighContrast && { color: '#FFE600' },
              ]}>
              {t('pillarsTitle')}
            </Text>

            <View style={styles.pillarGrid}>
              {/* Pillar 1 */}
              <View
                style={[
                  styles.pillarCard,
                  {
                    backgroundColor: isHighContrast ? '#000000' : theme.card,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                  },
                ]}>
                <View
                  style={[
                    styles.pillarIcon,
                    {
                      backgroundColor: isHighContrast ? '#1A1A1A' : theme.featureCommSurface,
                      borderColor: theme.featureComm,
                    },
                  ]}>
                  <Ionicons name="chatbubbles" size={24} color={theme.featureComm} />
                </View>
                <View style={styles.pillarContent}>
                  <Text
                    style={[
                      styles.pillarTitle,
                      { color: theme.text },
                      isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                    ]}>
                    {t('pillar1Title')}
                  </Text>
                  <Text
                    style={[
                      styles.pillarDesc,
                      { color: theme.textSecondary },
                      isHighContrast && { color: '#FFE600' },
                    ]}>
                    {t('pillar1Desc')}
                  </Text>
                </View>
              </View>

              {/* Pillar 2 */}
              <View
                style={[
                  styles.pillarCard,
                  {
                    backgroundColor: isHighContrast ? '#000000' : theme.card,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                  },
                ]}>
                <View
                  style={[
                    styles.pillarIcon,
                    {
                      backgroundColor: isHighContrast ? '#1A1A1A' : theme.featureVisionSurface,
                      borderColor: theme.featureVision,
                    },
                  ]}>
                  <Ionicons name="eye" size={24} color={theme.featureVision} />
                </View>
                <View style={styles.pillarContent}>
                  <Text
                    style={[
                      styles.pillarTitle,
                      { color: theme.text },
                      isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                    ]}>
                    {t('pillar2Title')}
                  </Text>
                  <Text
                    style={[
                      styles.pillarDesc,
                      { color: theme.textSecondary },
                      isHighContrast && { color: '#FFE600' },
                    ]}>
                    {t('pillar2Desc')}
                  </Text>
                </View>
              </View>

              {/* Pillar 3 */}
              <View
                style={[
                  styles.pillarCard,
                  {
                    backgroundColor: isHighContrast ? '#000000' : theme.card,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                  },
                ]}>
                <View
                  style={[
                    styles.pillarIcon,
                    {
                      backgroundColor: isHighContrast ? '#1A1A1A' : theme.featureHearingSurface,
                      borderColor: theme.featureHearing,
                    },
                  ]}>
                  <Ionicons name="ear" size={24} color={theme.featureHearing} />
                </View>
                <View style={styles.pillarContent}>
                  <Text
                    style={[
                      styles.pillarTitle,
                      { color: theme.text },
                      isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                    ]}>
                    {t('pillar3Title')}
                  </Text>
                  <Text
                    style={[
                      styles.pillarDesc,
                      { color: theme.textSecondary },
                      isHighContrast && { color: '#FFE600' },
                    ]}>
                    {t('pillar3Desc')}
                  </Text>
                </View>
              </View>

              {/* Pillar 4 */}
              <View
                style={[
                  styles.pillarCard,
                  {
                    backgroundColor: isHighContrast ? '#000000' : theme.card,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                  },
                ]}>
                <View
                  style={[
                    styles.pillarIcon,
                    {
                      backgroundColor: isHighContrast ? '#1A1A1A' : theme.featureRoutineSurface,
                      borderColor: theme.featureRoutine,
                    },
                  ]}>
                  <Ionicons name="calendar-outline" size={24} color={theme.featureRoutine} />
                </View>
                <View style={styles.pillarContent}>
                  <Text
                    style={[
                      styles.pillarTitle,
                      { color: theme.text },
                      isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                    ]}>
                    {t('pillar4Title')}
                  </Text>
                  <Text
                    style={[
                      styles.pillarDesc,
                      { color: theme.textSecondary },
                      isHighContrast && { color: '#FFE600' },
                    ]}>
                    {t('pillar4Desc')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.card,
            borderTopColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
            borderTopWidth: isHighContrast ? 2 : 1,
          },
        ]}>
        <AccessibleButton
          label={t('getStarted')}
          onPress={handleGetStarted}
          variant="primary"
          iconName="arrow-forward"
          iconPosition="right"
          size="large"
          fullWidth
          accessibilityHint="Navigates to the language selection page"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  collegeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  collegeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contrastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  contrastPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 100,
    alignItems: 'center',
  },
  mainContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  logoSection: {
    marginVertical: Spacing.six,
    alignItems: 'center',
  },
  introSection: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: Spacing.six,
  },
  subtitle: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.two,
    letterSpacing: 0.5,
  },
  description: {
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 620,
    marginBottom: Spacing.four,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    minHeight: MinTouchTarget,
  },
  voiceButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pillarsContainer: {
    width: '100%',
    marginVertical: Spacing.two,
  },
  pillarsHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  pillarGrid: {
    gap: Spacing.three,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.three,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pillarIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarContent: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  pillarDesc: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    alignItems: 'center',
  },
});
