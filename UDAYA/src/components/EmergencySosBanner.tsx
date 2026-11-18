import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { Radius, Spacing, MinTouchTarget } from '@/constants/theme';
import { AccessibleButton } from './AccessibleButton';

export const EmergencySosBanner: React.FC = () => {
  const { theme, isHighContrast, triggerHaptic } = useAccessibility();
  const { t, speak } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);

  const handleOpenSos = () => {
    triggerHaptic('warning');
    setModalVisible(true);
  };

  const handleTriggerSos = async () => {
    triggerHaptic('heavy');
    setIsAlerting(true);
    speak('Emergency SOS triggered. Notifying your emergency contacts with your live location.');
    
    // Simulate real alert confirmation
    setTimeout(() => {
      setIsAlerting(false);
      setModalVisible(false);
      Alert.alert(
        'Emergency Alert Sent (Demo Mode)',
        'In live deployment, an SMS and notification with live GPS coordinates is dispatched to your registered emergency contacts.\n\nStatus: SIMULATED READY',
        [{ text: 'OK' }]
      );
    }, 1500);
  };

  return (
    <>
      <Pressable
        onPress={handleOpenSos}
        accessibilityRole="button"
        accessibilityLabel={`${t('sosTitle')}. ${t('sosSubtitle')}`}
        accessibilityHint="Opens emergency alert dialog to notify family and emergency services"
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: isHighContrast ? '#000000' : theme.sosSurface,
            borderColor: isHighContrast ? '#FF3333' : theme.sosBorder,
            borderWidth: isHighContrast ? 3 : 1.5,
            opacity: pressed ? 0.9 : 1,
          },
        ]}>
        <View style={styles.contentRow}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isHighContrast ? '#FF3333' : theme.sos,
              },
            ]}>
            <Ionicons name="warning" size={26} color="#FFFFFF" />
          </View>

          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.title,
                  { color: isHighContrast ? '#FF3333' : theme.sos },
                ]}>
                {t('sosTitle')}
              </Text>
              <View
                style={[
                  styles.livePill,
                  { backgroundColor: isHighContrast ? '#FF3333' : theme.sos },
                ]}>
                <Text style={styles.liveText}>GPS READY</Text>
              </View>
            </View>
            <Text
              style={[
                styles.subtitle,
                { color: isHighContrast ? '#FFFFFF' : theme.textSecondary },
              ]}
              numberOfLines={2}>
              {t('sosSubtitle')}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color={isHighContrast ? '#FF3333' : theme.sos}
          />
        </View>
      </Pressable>

      {/* Emergency Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                borderColor: isHighContrast ? '#FF3333' : theme.sos,
                borderWidth: isHighContrast ? 3 : 2,
              },
            ]}>
            <View
              style={[
                styles.modalHeaderIcon,
                { backgroundColor: theme.sosSurface },
              ]}>
              <Ionicons name="alert-circle" size={48} color={theme.sos} />
            </View>

            <Text
              style={[
                styles.modalTitle,
                { color: isHighContrast ? '#FF3333' : theme.sos },
              ]}>
              {t('sosTitle')}
            </Text>

            <Text
              style={[
                styles.modalDescription,
                { color: theme.text },
                isHighContrast && { color: '#FFFFFF' },
              ]}>
              Pressing the button below will immediately trigger an emergency alert with your current location coordinates to your registered emergency contacts and caregivers.
            </Text>

            <View style={styles.modalButtons}>
              <AccessibleButton
                label={isAlerting ? 'Broadcasting Alert...' : 'CONFIRM & SEND SOS'}
                variant="danger"
                iconName="radio-outline"
                loading={isAlerting}
                onPress={handleTriggerSos}
                size="large"
                fullWidth
              />

              <AccessibleButton
                label={t('cancel')}
                variant="secondary"
                onPress={() => setModalVisible(false)}
                size="normal"
                fullWidth
                style={{ marginTop: Spacing.three }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginVertical: Spacing.two,
    minHeight: MinTouchTarget,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  livePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    padding: Spacing.six,
    alignItems: 'center',
  },
  modalHeaderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: Spacing.two,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.six,
  },
  modalButtons: {
    width: '100%',
  },
});
