import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';
import { StatusMessage } from './StatusMessage';

interface Props {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
}

export function ComingSoonModule({ title, icon, description }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={44} color={colors.white} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <StatusMessage type="info" message="Coming in the next development phase. This module is not yet implemented in Phase 5A." />
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      <Text style={styles.note}>No sample data, fake progress, or simulated actions are shown here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 12 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { ...typography.heading, color: colors.text, marginBottom: 8, textAlign: 'center' },
  desc: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  note: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 12 },
});
