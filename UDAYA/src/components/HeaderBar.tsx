import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { Radius, Spacing, MinTouchTarget } from '@/constants/theme';

interface HeaderBarProps {
  showBack?: boolean;
  title?: string;
  subtitle?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  showBack = false,
  title,
  subtitle,
}) => {
  const router = useRouter();
  const { theme, isHighContrast, toggleHighContrast, triggerHaptic } = useAccessibility();
  const { currentLanguage } = useLanguage();

  const handleLanguagePress = () => {
    triggerHaptic('selection');
    router.push('/language-select' as any);
  };

  const handleContrastPress = () => {
    triggerHaptic('selection');
    toggleHighContrast();
  };

  const handleBack = () => {
    triggerHaptic('selection');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderBottomColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
          borderBottomWidth: isHighContrast ? 2 : 1,
        },
      ]}>
      <View style={styles.leftGroup}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backButton,
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
        ) : (
          <View style={styles.brandRow}>
            <View
              style={[
                styles.miniLogo,
                {
                  backgroundColor: isHighContrast ? '#000000' : theme.primarySurface,
                  borderColor: isHighContrast ? '#FFE600' : theme.accent,
                },
              ]}>
              <Ionicons
                name="sunny"
                size={18}
                color={isHighContrast ? '#FFE600' : theme.accent}
              />
            </View>
            <View>
              <Text
                style={[
                  styles.brandText,
                  { color: theme.text },
                  isHighContrast && { color: '#FFFFFF', fontWeight: '900' },
                ]}>
                {title || 'UDAYA'}
              </Text>
              {subtitle && (
                <Text
                  style={[
                    styles.subtitleText,
                    { color: theme.textSecondary },
                    isHighContrast && { color: '#FFE600' },
                  ]}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.rightGroup}>
        {/* Language Selection Pill */}
        <Pressable
          onPress={handleLanguagePress}
          accessibilityRole="button"
          accessibilityLabel={`Change language, currently ${currentLanguage.nativeName}`}
          style={({ pressed }) => [
            styles.languagePill,
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
            name="globe-outline"
            size={16}
            color={isHighContrast ? '#FFE600' : theme.primary}
          />
          <Text
            style={[
              styles.languageText,
              { color: isHighContrast ? '#FFE600' : theme.primary },
            ]}>
            {currentLanguage.nativeName}
          </Text>
        </Pressable>

        {/* High-Contrast Toggle Button */}
        <Pressable
          onPress={handleContrastPress}
          accessibilityRole="button"
          accessibilityLabel={`Toggle High Contrast Mode. Currently ${
            isHighContrast ? 'Enabled' : 'Disabled'
          }`}
          style={({ pressed }) => [
            styles.contrastButton,
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
            size={20}
            color={isHighContrast ? '#000000' : theme.text}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    minHeight: 56,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  miniLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  backButton: {
    minWidth: MinTouchTarget,
    minHeight: MinTouchTarget,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    minHeight: 38,
  },
  languageText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contrastButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
