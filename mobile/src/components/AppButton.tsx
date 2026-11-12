import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radii, typography } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  testID?: string;
}

export function AppButton({ label, onPress, variant = 'primary', disabled, loading, accessibilityLabel, style, testID }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        {loading ? <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.white} /> : null}
        <Text style={[styles.text, variant === 'outline' ? styles.textOutline : styles.textSolid]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  danger: { backgroundColor: colors.danger },
  outline: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary },
  pressed: { opacity: 0.9 },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
  text: { ...typography.button },
  textSolid: { color: colors.white },
  textOutline: { color: colors.primary },
});
