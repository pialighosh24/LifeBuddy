import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme';

interface Props {
  type: 'error' | 'success' | 'info' | 'warning';
  message: string;
}

export function StatusMessage({ type, message }: Props) {
  const palette = {
    error: { bg: colors.dangerLight, fg: colors.danger, border: colors.danger },
    success: { bg: colors.successLight, fg: colors.success, border: colors.success },
    info: { bg: colors.primaryLight, fg: colors.primaryDark, border: colors.primary },
    warning: { bg: colors.warningLight, fg: colors.warning, border: colors.warning },
  }[type];
  return (
    <View style={[styles.box, { backgroundColor: palette.bg, borderColor: palette.border }]} accessibilityLiveRegion="polite">
      <Text style={[styles.text, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radii.md, padding: 12, marginVertical: 8 },
  text: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
});
