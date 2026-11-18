import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { LanguageItem } from '@/localization/languages';
import { Radius, Spacing, MinTouchTarget } from '@/constants/theme';

interface LanguageCardProps {
  language: LanguageItem;
  isSelected: boolean;
  onSelect: () => void;
  onPlaySample: (e: any) => void;
  isPlayingSample?: boolean;
}

export const LanguageCard: React.FC<LanguageCardProps> = ({
  language,
  isSelected,
  onSelect,
  onPlaySample,
  isPlayingSample = false,
}) => {
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();

  const handleCardPress = () => {
    triggerHaptic('selection');
    onSelect();
  };

  return (
    <Pressable
      onPress={handleCardPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${language.nativeName}, ${language.name}. ${language.subLabel}. ${
        isSelected ? 'Selected' : 'Not selected'
      }`}
      accessibilityHint="Double tap to choose this language"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isHighContrast
            ? isSelected
              ? '#1A1A1A'
              : '#000000'
            : isSelected
            ? theme.primarySurface
            : theme.card,
          borderColor: isHighContrast
            ? isSelected
              ? '#FFE600'
              : '#FFFFFF'
            : isSelected
            ? theme.primary
            : theme.cardBorder,
          borderWidth: isHighContrast ? (isSelected ? 3 : 1.5) : isSelected ? 2 : 1,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}>
      {/* Script Avatar Glyph */}
      <View
        style={[
          styles.symbolBadge,
          {
            backgroundColor: isHighContrast
              ? isSelected
                ? '#FFE600'
                : '#222222'
              : isSelected
              ? theme.primary
              : theme.backgroundElement,
          },
        ]}>
        <Text
          style={[
            styles.symbolText,
            {
              color: isHighContrast
                ? isSelected
                  ? '#000000'
                  : '#FFFFFF'
                : isSelected
                ? '#FFFFFF'
                : theme.text,
            },
          ]}>
          {language.symbol}
        </Text>
      </View>

      {/* Language Info */}
      <View style={styles.textContainer}>
        <View style={styles.nameRow}>
          <Text
            style={[
              styles.nativeName,
              {
                color: theme.text,
                fontSize: 18 * fontScale,
              },
              isHighContrast && { color: isSelected ? '#FFE600' : '#FFFFFF', fontWeight: '900' },
            ]}>
            {language.nativeName}
          </Text>
          {language.isRTL && (
            <View style={styles.rtlTag}>
              <Text style={styles.rtlTagText}>RTL</Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.englishName,
            {
              color: theme.textSecondary,
              fontSize: 13 * fontScale,
            },
            isHighContrast && { color: '#00FFFF' },
          ]}>
          {language.name} • {language.subLabel}
        </Text>
      </View>

      {/* Voice Sample Speaker Button */}
      <Pressable
        onPress={(e) => {
          triggerHaptic('selection');
          onPlaySample(e);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Listen to spoken sample in ${language.name}`}
        style={({ pressed }) => [
          styles.speakerBtn,
          {
            backgroundColor: isHighContrast
              ? '#333333'
              : pressed
              ? theme.cardHover
              : theme.backgroundElement,
            borderColor: isHighContrast ? '#FFE600' : theme.cardBorder,
          },
        ]}>
        <Ionicons
          name={isPlayingSample ? 'volume-high' : 'volume-medium-outline'}
          size={20}
          color={isHighContrast ? '#FFE600' : isSelected ? theme.primary : theme.textSecondary}
        />
      </Pressable>

      {/* Checkmark Indicator */}
      <View
        style={[
          styles.radioCircle,
          {
            borderColor: isHighContrast
              ? isSelected
                ? '#FFE600'
                : '#666666'
              : isSelected
              ? theme.primary
              : theme.border,
            backgroundColor: isSelected
              ? isHighContrast
                ? '#FFE600'
                : theme.primary
              : 'transparent',
          },
        ]}>
        {isSelected && (
          <Ionicons
            name="checkmark"
            size={16}
            color={isHighContrast ? '#000000' : '#FFFFFF'}
          />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Radius.lg,
    marginVertical: Spacing.one + 2,
    minHeight: MinTouchTarget + 16,
    gap: Spacing.three,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  symbolBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontSize: 18,
    fontWeight: '800',
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nativeName: {
    fontWeight: '800',
  },
  rtlTag: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rtlTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  englishName: {
    marginTop: 2,
    fontWeight: '500',
  },
  speakerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
