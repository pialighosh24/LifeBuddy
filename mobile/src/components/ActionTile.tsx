import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme';

interface Props {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  accessibilityLabel?: string;
  subtitle?: string;
}

export function ActionTile({ label, icon, color, onPress, accessibilityLabel, subtitle }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { borderColor: color }, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color }]}>
        <Ionicons name={icon} size={30} color={colors.white} />
      </View>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 2,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.9 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  label: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
