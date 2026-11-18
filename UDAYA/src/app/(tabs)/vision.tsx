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

export default function VisionAssistanceScreen() {
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();
  const { t, speak, stopSpeaking, isSpeaking } = useLanguage();

  const [activeTab, setActiveTab] = useState<'scene' | 'ocr' | 'guidance'>('scene');
  const [analyzing, setAnalyzing] = useState(false);
  const [sceneResult, setSceneResult] = useState<string>(
    'Medicine bottle labeled "Paracetamol 500mg" placed on table beside a glass of water.'
  );
  const [ocrResult, setOcrResult] = useState<string>(
    'EXPIRY: 12/2027. DOSAGE: Take one tablet twice daily after meals as directed by physician.'
  );

  const handleCaptureAndAnalyze = async () => {
    triggerHaptic('heavy');
    setAnalyzing(true);
    await stopSpeaking();

    setTimeout(() => {
      setAnalyzing(false);
      triggerHaptic('success');
      const textToSpeak =
        activeTab === 'scene'
          ? `Scene identified: ${sceneResult}`
          : `Extracted text: ${ocrResult}`;
      speak(textToSpeak);
    }, 1200);
  };

  const handleReadAloud = () => {
    triggerHaptic('selection');
    const textToSpeak =
      activeTab === 'scene'
        ? `Scene description: ${sceneResult}`
        : `Extracted text: ${ocrResult}`;
    speak(textToSpeak);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isHighContrast ? '#000000' : theme.background },
      ]}>
      <HeaderBar showBack title={t('feature2Title')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          {/* Member 2 Presentation Banner */}
          <View
            style={[
              styles.presenterBanner,
              {
                backgroundColor: isHighContrast ? '#111111' : theme.featureVisionSurface,
                borderColor: isHighContrast ? '#FFE600' : theme.featureVision,
              },
            ]}>
            <View style={styles.bannerRow}>
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: theme.featureVision },
                ]}>
                <Ionicons name="eye" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.presenterTitle,
                    { color: isHighContrast ? '#FFE600' : theme.featureVision },
                  ]}>
                  {t('feature2Presenter')}
                </Text>
                <Text
                  style={[
                    styles.presenterSub,
                    { color: isHighContrast ? '#FFFFFF' : theme.text },
                  ]}>
                  AI Scene Descriptor & OCR Text Reader
                </Text>
              </View>
            </View>
          </View>

          {/* Safety Notice Card */}
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isHighContrast ? '#1A1A1A' : theme.backgroundElement,
                borderColor: isHighContrast ? '#00FFFF' : theme.border,
              },
            ]}>
            <Ionicons
              name="shield-checkmark"
              size={18}
              color={isHighContrast ? '#00FFFF' : theme.primary}
            />
            <Text
              style={[
                styles.noticeText,
                { color: isHighContrast ? '#00FFFF' : theme.textSecondary },
              ]}>
              Vision assistance provides intelligent descriptive feedback. It does not replace a white cane, guide dog, or personal mobility aid.
            </Text>
          </View>

          {/* Mode Tabs */}
          <View style={styles.tabsRow}>
            {[
              { id: 'scene', label: 'Scene Description', icon: 'camera' },
              { id: 'ocr', label: 'OCR Text Reader', icon: 'document-text' },
              { id: 'guidance', label: 'Voice Guide', icon: 'navigate' },
            ].map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setActiveTab(tab.id as any);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.id }}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor:
                      activeTab === tab.id
                        ? isHighContrast
                          ? '#FFE600'
                          : theme.featureVision
                        : isHighContrast
                        ? '#000000'
                        : theme.card,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                    borderWidth: isHighContrast ? 2 : 1,
                  },
                ]}>
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={
                    activeTab === tab.id
                      ? isHighContrast
                        ? '#000000'
                        : '#FFFFFF'
                      : theme.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color:
                        activeTab === tab.id
                          ? isHighContrast
                            ? '#000000'
                            : '#FFFFFF'
                          : theme.text,
                      fontWeight: activeTab === tab.id ? '800' : '600',
                    },
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Camera Viewfinder Simulation */}
          <View
            style={[
              styles.cameraFrame,
              {
                backgroundColor: isHighContrast ? '#000000' : '#0B132B',
                borderColor: isHighContrast ? '#FFE600' : theme.featureVision,
                borderWidth: isHighContrast ? 3 : 2,
              },
            ]}>
            <View style={styles.crosshair}>
              <Ionicons
                name="scan-outline"
                size={84}
                color={isHighContrast ? '#FFE600' : '#38BDF8'}
              />
            </View>

            <View style={styles.cameraOverlay}>
              <View style={styles.camBadge}>
                <View style={styles.redDot} />
                <Text style={styles.camBadgeText}>CAMERA ACTIVE</Text>
              </View>

              <Text style={styles.camHintText}>
                {activeTab === 'scene'
                  ? 'Center objects or surroundings in frame'
                  : 'Align text, medicine label, or document'}
              </Text>
            </View>
          </View>

          {/* Action Trigger */}
          <AccessibleButton
            label={analyzing ? 'Analyzing Frame...' : 'CAPTURE & EXPLAIN ALOUD'}
            iconName="camera"
            variant="primary"
            loading={analyzing}
            onPress={handleCaptureAndAnalyze}
            size="large"
            fullWidth
            style={{ marginVertical: Spacing.three }}
          />

          {/* Analysis Results Card */}
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: isHighContrast ? '#000000' : theme.card,
                borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                borderWidth: isHighContrast ? 2.5 : 1,
              },
            ]}>
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderLeft}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={isHighContrast ? '#FFE600' : theme.featureVision}
                />
                <Text
                  style={[
                    styles.resultTitle,
                    { color: isHighContrast ? '#FFE600' : theme.featureVision },
                  ]}>
                  {activeTab === 'scene' ? 'SCENE DESCRIPTION' : 'OCR RECOGNIZED TEXT'}
                </Text>
              </View>

              <Pressable
                onPress={handleReadAloud}
                accessibilityRole="button"
                accessibilityLabel="Read result text aloud"
                style={({ pressed }) => [
                  styles.audioSpeakerBtn,
                  {
                    backgroundColor: isHighContrast
                      ? '#FFE600'
                      : pressed
                      ? theme.primaryHover
                      : theme.primarySurface,
                  },
                ]}>
                <Ionicons
                  name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
                  size={18}
                  color={isHighContrast ? '#000000' : theme.primary}
                />
                <Text
                  style={[
                    styles.audioBtnText,
                    { color: isHighContrast ? '#000000' : theme.primary },
                  ]}>
                  Speak
                </Text>
              </Pressable>
            </View>

            <Text
              style={[
                styles.resultBody,
                {
                  color: theme.text,
                  fontSize: 15 * fontScale,
                },
                isHighContrast && { color: '#FFFFFF', fontWeight: '700' },
              ]}>
              {activeTab === 'scene' ? sceneResult : ocrResult}
            </Text>
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
    marginBottom: Spacing.two,
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
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.three,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    minHeight: MinTouchTarget,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  cameraFrame: {
    height: 220,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  crosshair: {
    opacity: 0.8,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  camBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  camBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  camHintText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
  },
  resultCard: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  audioSpeakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  audioBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultBody: {
    lineHeight: 22,
    fontWeight: '500',
  },
});
