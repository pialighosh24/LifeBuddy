import React from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { colors, radii, typography } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
}

export function AppTextInput({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label} accessibilityRole="text">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel || label}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { ...typography.label, color: colors.text, marginBottom: 6 },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, marginTop: 6, fontSize: 14 },
});
