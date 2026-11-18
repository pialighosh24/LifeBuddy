import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'outline' | 'ghost';

interface AccessibleButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'normal' | 'large' | 'compact';
  accessibilityHint?: string;
  fullWidth?: boolean;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  iconName,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  size = 'normal',
  accessibilityHint,
  fullWidth = false,
}) => {
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic(variant === 'danger' ? 'warning' : 'selection');
    onPress();
  };

  const getBackgroundColor = (pressed: boolean): string => {
    if (disabled) {
      return isHighContrast ? '#333333' : theme.backgroundElement;
    }
    if (isHighContrast) {
      if (variant === 'danger') return pressed ? '#B91C1C' : theme.sos;
      if (variant === 'outline' || variant === 'ghost') return pressed ? '#222222' : 'transparent';
      return pressed ? '#E6CE00' : theme.primary;
    }

    switch (variant) {
      case 'primary':
        return pressed ? theme.primaryHover : theme.primary;
      case 'accent':
        return pressed ? '#D97706' : theme.accent;
      case 'danger':
        return pressed ? '#B91C1C' : theme.sos;
      case 'secondary':
        return pressed ? theme.cardHover : theme.backgroundElement;
      case 'outline':
      case 'ghost':
        return pressed ? theme.backgroundElement : 'transparent';
      default:
        return theme.primary;
    }
  };

  const getTextColor = (): string => {
    if (disabled) {
      return isHighContrast ? '#888888' : theme.textMuted;
    }
    if (isHighContrast) {
      if (variant === 'outline' || variant === 'ghost') return '#FFFFFF';
      return variant === 'primary' ? '#000000' : '#FFFFFF';
    }

    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'accent':
        return '#1E1B4B';
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return theme.text;
      case 'outline':
        return theme.primary;
      case 'ghost':
        return theme.text;
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = (): string => {
    if (isHighContrast) {
      if (disabled) return '#666666';
      if (variant === 'danger') return '#FF3333';
      return '#FFFFFF';
    }
    if (variant === 'outline') {
      return theme.primary;
    }
    return 'transparent';
  };

  const padVertical = size === 'large' ? Spacing.five : size === 'compact' ? Spacing.two : Spacing.four;
  const padHorizontal = size === 'large' ? Spacing.seven : size === 'compact' ? Spacing.three : Spacing.six;
  const fontSize = (size === 'large' ? 18 : size === 'compact' ? 14 : 16) * fontScale;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, busy: loading }}
      style={({ pressed }) => [
        styles.buttonBase,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          borderWidth: isHighContrast ? 2.5 : variant === 'outline' ? 1.5 : 0,
          paddingVertical: padVertical,
          paddingHorizontal: padHorizontal,
          minHeight: MinTouchTarget,
          width: fullWidth ? '100%' : 'auto',
          opacity: pressed ? 0.92 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {iconName && iconPosition === 'left' && (
            <Ionicons
              name={iconName}
              size={fontSize + 2}
              color={getTextColor()}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.buttonText,
              {
                color: getTextColor(),
                fontSize,
                fontWeight: isHighContrast ? '800' : '700',
              },
              textStyle,
            ]}>
            {label}
          </Text>
          {iconName && iconPosition === 'right' && (
            <Ionicons
              name={iconName}
              size={fontSize + 2}
              color={getTextColor()}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
