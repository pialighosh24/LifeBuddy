import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { Radius, Spacing, MinTouchTarget } from '@/constants/theme';

interface QuickToolCardProps {
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

export const QuickToolCard: React.FC<QuickToolCardProps> = ({
  title,
  description,
  iconName,
  color,
  onPress,
}) => {
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();

  const handlePress = () => {
    triggerHaptic('selection');
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isHighContrast ? '#000000' : theme.card,
          borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
          borderWidth: isHighContrast ? 2 : 1,
          opacity: pressed ? 0.92 : 1,
        },
      ]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isHighContrast ? '#1A1A1A' : theme.backgroundElement,
            borderColor: isHighContrast ? '#FFE600' : color,
          },
        ]}>
        <Ionicons
          name={iconName}
          size={22}
          color={isHighContrast ? '#FFE600' : color}
        />
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.text,
            fontSize: 14 * fontScale,
          },
          isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
        ]}
        numberOfLines={1}>
        {title}
      </Text>

      <Text
        style={[
          styles.description,
          {
            color: theme.textSecondary,
            fontSize: 11 * fontScale,
          },
          isHighContrast && { color: '#FFE600' },
        ]}
        numberOfLines={2}>
        {description}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    minHeight: MinTouchTarget * 2,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    lineHeight: 15,
    fontWeight: '500',
  },
});
