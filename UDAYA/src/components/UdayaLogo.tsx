import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';

interface UdayaLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  inverted?: boolean;
}

export const UdayaLogo: React.FC<UdayaLogoProps> = ({
  size = 'medium',
  showTagline = false,
  inverted = false,
}) => {
  const { theme, isHighContrast } = useAccessibility();

  const iconSizes = {
    small: 28,
    medium: 44,
    large: 64,
  };

  const titleSizes = {
    small: 18,
    medium: 26,
    large: 36,
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.emblemContainer,
          size === 'small' && styles.emblemSmall,
          size === 'medium' && styles.emblemMedium,
          size === 'large' && styles.emblemLarge,
          {
            backgroundColor: isHighContrast
              ? '#000000'
              : inverted
              ? 'rgba(255,255,255,0.15)'
              : theme.primarySurface,
            borderColor: isHighContrast ? '#FFE600' : theme.accent,
          },
        ]}
        accessibilityRole="image"
        accessibilityLabel="UDAYA dawn rising sun emblem">
        <Ionicons
          name="sunny"
          size={iconSizes[size]}
          color={isHighContrast ? '#FFE600' : theme.accent}
        />
      </View>

      <View style={styles.textGroup}>
        <View style={styles.brandRow}>
          <Text
            style={[
              styles.brandName,
              {
                fontSize: titleSizes[size],
                color: inverted ? '#FFFFFF' : theme.text,
              },
              isHighContrast && styles.highContrastBrand,
            ]}>
            UDAYA
          </Text>
          <View
            style={[
              styles.dot,
              { backgroundColor: isHighContrast ? '#00FFFF' : theme.primary },
            ]}
          />
        </View>

        {showTagline && (
          <Text
            style={[
              styles.tagline,
              { color: inverted ? '#E2E8F0' : theme.textSecondary },
              isHighContrast && { color: '#FFE600', fontWeight: '700' },
            ]}>
            A Brighter Tomorrow for Everyone.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemContainer: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  emblemSmall: {
    width: 44,
    height: 44,
  },
  emblemMedium: {
    width: 72,
    height: 72,
    marginBottom: 8,
  },
  emblemLarge: {
    width: 104,
    height: 104,
    marginBottom: 14,
    borderWidth: 3,
  },
  textGroup: {
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandName: {
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: 'System',
  },
  highContrastBrand: {
    color: '#FFFFFF',
    textShadowColor: '#FFE600',
    textShadowRadius: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
