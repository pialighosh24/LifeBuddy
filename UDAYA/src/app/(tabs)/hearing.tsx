import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { HeaderBar } from '@/components/HeaderBar';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Radius, Spacing, MaxContentWidth, MinTouchTarget } from '@/constants/theme';

interface SoundAlert {
  id: string;
  name: string;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  severity: 'critical' | 'high' | 'medium';
}

export default function HearingAssistanceScreen() {
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();
  const { t, speak } = useLanguage();

  const [isListening, setIsListening] = useState(false);
  const [activeAlert, setActiveAlert] = useState<SoundAlert | null>(null);
  const [twoWayText, setTwoWayText] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ sender: 'user' | 'assistant'; text: string }>
  >([
    { sender: 'assistant', text: 'Hello! I am ready to transcribe speech for you in real time.' },
  ]);

  const SOUND_EVENTS: SoundAlert[] = [
    { id: '1', name: 'Fire Alarm', category: 'Safety Alert', icon: 'flame', color: '#DC2626', severity: 'critical' },
    { id: '2', name: 'Doorbell', category: 'Home Notification', icon: 'notifications', color: '#D97706', severity: 'medium' },
    { id: '3', name: 'Emergency Siren', category: 'Vehicle / Ambulance', icon: 'warning', color: '#EF4444', severity: 'critical' },
    { id: '4', name: 'Vehicle Horn', category: 'Road Hazard', icon: 'car', color: '#F59E0B', severity: 'high' },
    { id: '5', name: 'Baby Crying', category: 'Family Alert', icon: 'happy', color: '#EC4899', severity: 'medium' },
    { id: '6', name: 'Glass Breaking', category: 'Security Hazard', icon: 'shield', color: '#7C3AED', severity: 'high' },
  ];

  const handleSimulateSoundAlert = (alert: SoundAlert) => {
    triggerHaptic(alert.severity === 'critical' ? 'heavy' : 'warning');
    setActiveAlert(alert);
  };

  const handleToggleListening = () => {
    triggerHaptic('selection');
    const next = !isListening;
    setIsListening(next);
    if (next) {
      setTimeout(() => {
        setConversationHistory((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: 'Live Caption: "The speaker is saying: The lecture will begin in five minutes. Please take your seats."',
          },
        ]);
        triggerHaptic('success');
      }, 1500);
    }
  };

  const handleSendTwoWay = () => {
    if (!twoWayText.trim()) return;
    triggerHaptic('selection');
    const newMsg = twoWayText.trim();
    setConversationHistory((prev) => [...prev, { sender: 'user', text: newMsg }]);
    setTwoWayText('');
    speak(newMsg);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isHighContrast ? '#000000' : theme.background },
      ]}>
      <HeaderBar showBack title={t('feature3Title')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          {/* Member 3 Presentation Banner */}
          <View
            style={[
              styles.presenterBanner,
              {
                backgroundColor: isHighContrast ? '#111111' : theme.featureHearingSurface,
                borderColor: isHighContrast ? '#FFE600' : theme.featureHearing,
              },
            ]}>
            <View style={styles.bannerRow}>
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: theme.featureHearing },
                ]}>
                <Ionicons name="ear" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.presenterTitle,
                    { color: isHighContrast ? '#FFE600' : theme.featureHearing },
                  ]}>
                  {t('feature3Presenter')}
                </Text>
                <Text
                  style={[
                    styles.presenterSub,
                    { color: isHighContrast ? '#FFFFFF' : theme.text },
                  ]}>
                  Speech-to-Text Captions & Sound Awareness System
                </Text>
              </View>
            </View>
          </View>

          {/* Active Sound Detection Alert Banner (Visual & Tactile Alert) */}
          {activeAlert && (
            <View
              style={[
                styles.activeAlertCard,
                {
                  backgroundColor: isHighContrast ? '#000000' : `${activeAlert.color}15`,
                  borderColor: isHighContrast ? '#FF3333' : activeAlert.color,
                },
              ]}>
              <View
                style={[
                  styles.alertIconWrap,
                  { backgroundColor: activeAlert.color },
                ]}>
                <Ionicons name={activeAlert.icon} size={28} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.alertTagRow}>
                  <Text style={[styles.alertSeverity, { color: activeAlert.color }]}>
                    {activeAlert.severity.toUpperCase()} ALERT DETECTED
                  </Text>
                </View>
                <Text
                  style={[
                    styles.alertTitle,
                    { color: theme.text },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '900' },
                  ]}>
                  {activeAlert.name}
                </Text>
                <Text
                  style={[
                    styles.alertCategory,
                    { color: theme.textSecondary },
                    isHighContrast && { color: '#FFE600' },
                  ]}>
                  {activeAlert.category} • Haptic vibration pulse active
                </Text>
              </View>

              <Pressable
                onPress={() => setActiveAlert(null)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss sound alert">
                <Ionicons name="close-circle" size={24} color={theme.textMuted} />
              </Pressable>
            </View>
          )}

          {/* Live Captions Console */}
          <View
            style={[
              styles.captionConsole,
              {
                backgroundColor: isHighContrast ? '#000000' : theme.card,
                borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                borderWidth: isHighContrast ? 2.5 : 1,
              },
            ]}>
            <View style={styles.captionTop}>
              <View style={styles.micIndicator}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isListening ? '#10B981' : theme.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.micStatusText,
                    { color: isListening ? '#10B981' : theme.textSecondary },
                  ]}>
                  {isListening ? 'LIVE SPEECH TRANSCRIBING' : 'MICROPHONE PAUSED'}
                </Text>
              </View>

              <Pressable
                onPress={handleToggleListening}
                accessibilityRole="button"
                accessibilityLabel={isListening ? 'Stop transcribing' : 'Start transcribing'}
                style={({ pressed }) => [
                  styles.micToggleBtn,
                  {
                    backgroundColor: isListening
                      ? theme.sos
                      : isHighContrast
                      ? '#FFE600'
                      : theme.primary,
                  },
                ]}>
                <Ionicons
                  name={isListening ? 'stop' : 'mic'}
                  size={16}
                  color={isHighContrast && !isListening ? '#000000' : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.micToggleText,
                    { color: isHighContrast && !isListening ? '#000000' : '#FFFFFF' },
                  ]}>
                  {isListening ? 'Stop' : 'Start'}
                </Text>
              </Pressable>
            </View>

            {/* Transcribed Text Stream */}
            <View
              style={[
                styles.transcriptBox,
                {
                  backgroundColor: isHighContrast ? '#111111' : theme.backgroundElement,
                  borderColor: isHighContrast ? '#333333' : theme.cardBorder,
                },
              ]}>
              {conversationHistory.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.msgBubble,
                    msg.sender === 'user' ? styles.userBubble : styles.assistantBubble,
                    {
                      backgroundColor:
                        msg.sender === 'user'
                          ? isHighContrast
                            ? '#333333'
                            : theme.primarySurface
                          : 'transparent',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.transcriptText,
                      {
                        color: theme.text,
                        fontSize: 16 * fontScale,
                      },
                      isHighContrast && { color: '#FFFFFF', fontWeight: '700' },
                    ]}>
                    {msg.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Two-Way Typed Communication Input */}
            <View style={styles.inputRow}>
              <TextInput
                value={twoWayText}
                onChangeText={setTwoWayText}
                placeholder="Type your reply to read aloud..."
                placeholderTextColor={theme.textMuted}
                accessibilityLabel="Type reply for two-way communication"
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    backgroundColor: isHighContrast ? '#111111' : theme.backgroundElement,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                  },
                ]}
              />
              <AccessibleButton
                label="Speak"
                iconName="send"
                onPress={handleSendTwoWay}
                size="compact"
                disabled={!twoWayText.trim()}
              />
            </View>
          </View>

          {/* Sound Awareness Simulation Grid */}
          <View style={styles.sectionTitleRow}>
            <Text
              style={[
                styles.sectionHeader,
                { color: theme.text },
                isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
              ]}>
              Environmental Sound Detection (Demo Simulation)
            </Text>
          </View>

          <View style={styles.soundGrid}>
            {SOUND_EVENTS.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => handleSimulateSoundAlert(event)}
                accessibilityRole="button"
                accessibilityLabel={`Test ${event.name} sound recognition alert`}
                style={({ pressed }) => [
                  styles.soundCard,
                  {
                    backgroundColor: isHighContrast ? '#000000' : theme.card,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                    borderWidth: isHighContrast ? 2 : 1,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.soundIconCircle,
                    { backgroundColor: `${event.color}15`, borderColor: event.color },
                  ]}>
                  <Ionicons name={event.icon} size={22} color={event.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.soundName,
                      { color: theme.text },
                      isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                    ]}>
                    {event.name}
                  </Text>
                  <Text
                    style={[
                      styles.soundCategory,
                      { color: theme.textSecondary },
                      isHighContrast && { color: '#FFE600' },
                    ]}>
                    {event.category}
                  </Text>
                </View>

                <Ionicons
                  name="radio"
                  size={16}
                  color={isHighContrast ? '#FFE600' : event.color}
                />
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
  activeAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 2.5,
    marginBottom: Spacing.three,
  },
  alertIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTagRow: {
    marginBottom: 2,
  },
  alertSeverity: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  alertCategory: {
    fontSize: 12,
    fontWeight: '500',
  },
  captionConsole: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  captionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  micIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  micStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  micToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  micToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  transcriptBox: {
    minHeight: 120,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  msgBubble: {
    padding: Spacing.two,
    borderRadius: Radius.md,
    marginBottom: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  transcriptText: {
    lineHeight: 22,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    height: MinTouchTarget,
    borderWidth: 1,
    fontSize: 14,
  },
  sectionTitleRow: {
    marginVertical: Spacing.two,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
  },
  soundGrid: {
    gap: Spacing.two,
  },
  soundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    minHeight: MinTouchTarget + 6,
  },
  soundIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundName: {
    fontSize: 14,
    fontWeight: '700',
  },
  soundCategory: {
    fontSize: 11,
    fontWeight: '500',
  },
});
