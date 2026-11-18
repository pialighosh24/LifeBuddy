import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { Radius, Spacing, MinTouchTarget } from '@/constants/theme';

export interface FeatureHeroCardProps {
  memberBadge: string;
  categoryTag: string;
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  surfaceColor: string;
  onPress: () => void;
  overviewSummary: string;
}

export const FeatureHeroCard: React.FC<FeatureHeroCardProps> = ({
  memberBadge,
  categoryTag,
  title,
  subtitle,
  iconName,
  accentColor,
  surfaceColor,
  onPress,
  overviewSummary,
}) => {
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();
  const { speak } = useLanguage();

  const handleCardPress = () => {
    triggerHaptic('selection');
    onPress();
  };

  const handleAudioOverview = (e: any) => {
    e.stopPropagation();
    triggerHaptic('selection');
    speak(`${title}. ${subtitle}. ${overviewSummary}`);
  };

  return (
    <Pressable
      onPress={handleCardPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${memberBadge}. ${subtitle}`}
      accessibilityHint="Double tap to open this presentation module"
      style={({ pressed }) => [
        styles.cardContainer,
        {
          backgroundColor: isHighContrast ? '#000000' : theme.card,
          borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
          borderWidth: isHighContrast ? 2.5 : 1,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}>
      {/* Top Banner Row: Member Badge + Voice button */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isHighContrast ? '#1A1A1A' : surfaceColor,
              borderColor: isHighContrast ? '#FFE600' : accentColor,
            },
          ]}>
          <Text
            style={[
              styles.badgeText,
              { color: isHighContrast ? '#FFE600' : accentColor },
            ]}>
            {memberBadge}
          </Text>
        </View>

        <Pressable
          onPress={handleAudioOverview}
          accessibilityRole="button"
          accessibilityLabel="Listen to voice overview of this module"
          style={({ pressed }) => [
            styles.soundPill,
            {
              backgroundColor: isHighContrast
                ? '#FFE600'
                : pressed
                ? theme.backgroundElement
                : surfaceColor,
            },
          ]}>
          <Ionicons
            name="volume-high-outline"
            size={16}
            color={isHighContrast ? '#000000' : accentColor}
          />
        </Pressable>
      </View>

      {/* Main Body: Icon + Texts */}
      <View style={styles.mainRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isHighContrast ? '#000000' : surfaceColor,
              borderColor: isHighContrast ? '#FFE600' : accentColor,
            },
          ]}>
          <Ionicons
            name={iconName}
            size={32}
            color={isHighContrast ? '#FFE600' : accentColor}
          />
        </View>

        <View style={styles.contentCol}>
          <Text
            style={[
              styles.categoryTag,
              { color: isHighContrast ? '#00FFFF' : accentColor },
            ]}>
            {categoryTag.toUpperCase()}
          </Text>

          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontSize: 18 * fontScale,
              },
              isHighContrast && { color: '#FFFFFF', fontWeight: '900' },
            ]}>
            {title}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: theme.textSecondary,
                fontSize: 13 * fontScale,
              },
              isHighContrast && { color: '#FFE600' },
            ]}
            numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Bottom Action Footer */}
      <View
        style={[
          styles.footerRow,
          {
            borderTopColor: isHighContrast ? '#333333' : theme.backgroundElement,
          },
        ]}>
        <Text
          style={[
            styles.actionText,
            { color: isHighContrast ? '#00FFFF' : theme.primary },
          ]}>
          Interactive Demo Screen
        </Text>

        <View
          style={[
            styles.arrowCircle,
            {
              backgroundColor: isHighContrast ? '#FFE600' : accentColor,
            },
          ]}>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={isHighContrast ? '#000000' : '#FFFFFF'}
          />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginVertical: Spacing.two,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  soundPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.three,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 2,
  },
  subtitle: {
    lineHeight: 18,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
