import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { BottomTabInset } from '@/constants/theme';

export default function TabsLayout() {
  const { theme, isHighContrast } = useAccessibility();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isHighContrast ? '#FFE600' : theme.primary,
        tabBarInactiveTintColor: isHighContrast ? '#888888' : theme.textMuted,
        tabBarStyle: {
          backgroundColor: isHighContrast ? '#000000' : theme.card,
          borderTopColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
          borderTopWidth: isHighContrast ? 2 : 1,
          height: BottomTabInset + 18,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: isHighContrast ? '800' : '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('navHome'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="communication"
        options={{
          title: t('navComm'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="vision"
        options={{
          title: t('navVision'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'eye' : 'eye-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="hearing"
        options={{
          title: t('navHearing'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'ear' : 'ear-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="routine"
        options={{
          title: t('navRoutine'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t('navSettings'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />
    </Tabs>
  );
}
