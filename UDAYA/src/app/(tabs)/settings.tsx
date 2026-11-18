import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { HeaderBar } from '@/components/HeaderBar';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Radius, Spacing, MaxContentWidth, MinTouchTarget } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    theme,
    isHighContrast,
    toggleHighContrast,
    fontScale,
    setFontScale,
    hapticsEnabled,
    toggleHaptics,
    speechGuidanceEnabled,
    toggleSpeechGuidance,
    triggerHaptic,
  } = useAccessibility();

  const { t, currentLanguage, speak } = useLanguage();

  const handleTestSpeech = () => {
    triggerHaptic('selection');
    speak('This is a test of UDAYA spoken voice guidance.');
  };

  const handleResetOnboarding = async () => {
    triggerHaptic('warning');
    Alert.alert(
      'Reset App Onboarding',
      'This will clear saved language and return to the Welcome presentation screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@udaya_has_selected_lang');
              router.replace('/welcome' as any);
            } catch (e) {
              console.warn(e);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isHighContrast ? '#000000' : theme.background },
      ]}>
      <HeaderBar title={t('settingsTitle')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          {/* Visual Accessibility Section */}
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text },
                isHighContrast && { color: '#FFE600', fontWeight: '800' },
              ]}>
              Visual Accessibility
            </Text>
          </View>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: isHighContrast ? '#000000' : theme.card,
                borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                borderWidth: isHighContrast ? 2 : 1,
              },
            ]}>
            {/* High Contrast Mode */}
            <View style={styles.settingRow}>
              <View style={styles.settingIconCol}>
                <Ionicons
                  name="contrast"
                  size={22}
                  color={isHighContrast ? '#FFE600' : theme.primary}
                />
              </View>
              <View style={styles.settingTextCol}>
                <Text
                  style={[
                    styles.settingTitle,
                    { color: theme.text },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                  ]}>
                  High Contrast Mode
                </Text>
                <Text
                  style={[
                    styles.settingSub,
                    { color: theme.textSecondary },
                    isHighContrast && { color: '#FFE600' },
                  ]}>
                  Pure black background with bold high-visibility accents
                </Text>
              </View>
              <Switch
                value={isHighContrast}
                onValueChange={() => {
                  triggerHaptic('selection');
                  toggleHighContrast();
                }}
                trackColor={{ false: theme.border, true: '#FFE600' }}
                thumbColor={isHighContrast ? '#000000' : '#FFFFFF'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

            {/* Font Scaling */}
            <View style={styles.settingRow}>
              <View style={styles.settingIconCol}>
                <Ionicons
                  name="text"
                  size={22}
                  color={isHighContrast ? '#FFE600' : theme.primary}
                />
              </View>
              <View style={styles.settingTextCol}>
                <Text
                  style={[
                    styles.settingTitle,
                    { color: theme.text },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                  ]}>
                  {t('fontSizeLabel')}
                </Text>
                <Text
                  style={[
                    styles.settingSub,
                    { color: theme.textSecondary },
                    isHighContrast && { color: '#FFE600' },
                  ]}>
                  Scale all text elements for low-vision reading
                </Text>

                <View style={styles.fontScaleButtons}>
                  {[
                    { scale: 1.0, label: 'Standard' },
                    { scale: 1.15, label: 'Large' },
                    { scale: 1.3, label: 'Extra Large' },
                  ].map((btn) => (
                    <Pressable
                      key={btn.scale}
                      onPress={() => {
                        triggerHaptic('selection');
                        setFontScale(btn.scale);
                      }}
                      accessibilityRole="button"
                      style={[
                        styles.scaleBtn,
                        {
                          backgroundColor:
                            fontScale === btn.scale
                              ? isHighContrast
                                ? '#FFE600'
                                : theme.primary
                              : isHighContrast
                              ? '#1A1A1A'
                              : theme.backgroundElement,
                          borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.scaleBtnText,
                          {
                            color:
                              fontScale === btn.scale
                                ? isHighContrast
                                  ? '#000000'
                                  : '#FFFFFF'
                                : theme.text,
                            fontWeight: fontScale === btn.scale ? '800' : '600',
                          },
                        ]}>
                        {btn.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Language & Voice Section */}
          <View style={[styles.sectionHeader, { marginTop: Spacing.four }]}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text },
                isHighContrast && { color: '#FFE600', fontWeight: '800' },
              ]}>
              Language & Voice Settings
            </Text>
          </View>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: isHighContrast ? '#000000' : theme.card,
                borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                borderWidth: isHighContrast ? 2 : 1,
              },
            ]}>
            {/* Language Selector */}
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                router.push('/language-select' as any);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Change app language, currently ${currentLanguage.name}`}
              style={styles.settingRow}>
              <View style={styles.settingIconCol}>
                <Ionicons
                  name="globe"
                  size={22}
                  color={isHighContrast ? '#FFE600' : theme.primary}
                />
              </View>
              <View style={styles.settingTextCol}>
                <Text
                  style={[
                    styles.settingTitle,
                    { color: theme.text },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                  ]}>
                  {t('activeLanguagePill')}
                </Text>
                <Text
                  style={[
                    styles.settingSub,
                    { color: theme.textSecondary },
                    isHighContrast && { color: '#FFE600' },
                  ]}>
                  Current: {currentLanguage.nativeName} ({currentLanguage.name})
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isHighContrast ? '#FFE600' : theme.textMuted}
              />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

            {/* Voice Guidance Test */}
            <View style={styles.settingRow}>
              <View style={styles.settingIconCol}>
                <Ionicons
                  name="volume-high"
                  size={22}
                  color={isHighContrast ? '#FFE600' : theme.primary}
                />
              </View>
              <View style={styles.settingTextCol}>
                <Text
                  style={[
                    styles.settingTitle,
                    { color: theme.text },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                  ]}>
                  {t('soundFeedback')}
                </Text>
                <Text
                  style={[
                    styles.settingSub,
                    { color: theme.textSecondary },
                    isHighContrast && { color: '#FFE600' },
                  ]}>
                  Read instructions, AAC cards and OCR text aloud
                </Text>
              </View>
              <AccessibleButton
                label="Test Audio"
                variant="outline"
                size="compact"
                onPress={handleTestSpeech}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

            {/* Haptics */}
            <View style={styles.settingRow}>
              <View style={styles.settingIconCol}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={22}
                  color={isHighContrast ? '#FFE600' : theme.primary}
                />
              </View>
              <View style={styles.settingTextCol}>
                <Text
                  style={[
                    styles.settingTitle,
                    { color: theme.text },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                  ]}>
                  {t('hapticFeedback')}
                </Text>
                <Text
                  style={[
                    styles.settingSub,
                    { color: theme.textSecondary },
                    isHighContrast && { color: '#FFE600' },
                  ]}>
                  Vibrational confirmation on button presses and alarms
                </Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={() => {
                  triggerHaptic('selection');
                  toggleHaptics();
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          </View>

          {/* College Project Credits */}
          <View
            style={[
              styles.aboutCard,
              {
                backgroundColor: isHighContrast ? '#111111' : theme.primarySurface,
                borderColor: isHighContrast ? '#FFE600' : theme.primary,
              },
            ]}>
            <View style={styles.aboutRow}>
              <Ionicons
                name="school"
                size={28}
                color={isHighContrast ? '#FFE600' : theme.primary}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.aboutTitle,
                    { color: isHighContrast ? '#FFE600' : theme.primary },
                  ]}>
                  UDAYA • Final Year BCA Project
                </Text>
                <Text
                  style={[
                    styles.aboutSub,
                    { color: isHighContrast ? '#FFFFFF' : theme.text },
                  ]}>
                  "A Brighter Tomorrow for Everyone."
                </Text>
                <Text
                  style={[
                    styles.aboutDesc,
                    { color: isHighContrast ? '#FFE600' : theme.textSecondary },
                  ]}>
                  Collaborative 4-Member Innovation for Accessibility & Daily Assistance.
                </Text>
              </View>
            </View>
          </View>

          {/* Reset Onboarding for Presentation Demonstration */}
          <AccessibleButton
            label="Replay Welcome & Onboarding Flow"
            variant="secondary"
            iconName="refresh"
            onPress={handleResetOnboarding}
            size="normal"
            fullWidth
            style={{ marginVertical: Spacing.four }}
          />
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
  sectionHeader: {
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardGroup: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    minHeight: MinTouchTarget + 10,
    gap: Spacing.three,
  },
  settingIconCol: {
    width: 32,
    alignItems: 'center',
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  fontScaleButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  scaleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  scaleBtnText: {
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  aboutCard: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    borderWidth: 1.5,
    marginTop: Spacing.three,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  aboutSub: {
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: 2,
  },
  aboutDesc: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
});
