import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useLanguage } from '@/context/LanguageContext';
import { HeaderBar } from '@/components/HeaderBar';
import { AccessibleButton } from '@/components/AccessibleButton';
import { Radius, Spacing, MaxContentWidth, MinTouchTarget } from '@/constants/theme';

interface RoutineTask {
  id: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  title: string;
  instruction: string;
  icon: keyof typeof Ionicons.glyphMap;
  completed: boolean;
  timeHint: string;
}

export default function SmartDailyRoutineScreen() {
  const { theme, isHighContrast, triggerHaptic, fontScale } = useAccessibility();
  const { t, speak } = useLanguage();

  const [activeSlot, setActiveSlot] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [tasks, setTasks] = useState<RoutineTask[]>([
    {
      id: 'm1',
      timeSlot: 'morning',
      title: 'Wake up & Stretch',
      instruction: 'Take three deep breaths and sit up slowly.',
      icon: 'sunny',
      completed: true,
      timeHint: '07:00 AM',
    },
    {
      id: 'm2',
      timeSlot: 'morning',
      title: 'Brush Teeth & Face Wash',
      instruction: 'Brush thoroughly for 2 minutes with warm water.',
      icon: 'water',
      completed: true,
      timeHint: '07:30 AM',
    },
    {
      id: 'm3',
      timeSlot: 'morning',
      title: 'Healthy Breakfast & Medicine',
      instruction: 'Eat your morning breakfast and take morning vitamins.',
      icon: 'restaurant',
      completed: true,
      timeHint: '08:15 AM',
    },
    {
      id: 'a1',
      timeSlot: 'afternoon',
      title: 'Nutritious Lunch',
      instruction: 'Enjoy fresh lunch and drink a glass of water.',
      icon: 'nutrition',
      completed: false,
      timeHint: '01:00 PM',
    },
    {
      id: 'a2',
      timeSlot: 'afternoon',
      title: 'Study & Skill Practice',
      instruction: 'Spend 30 minutes reading or learning in Udaya zone.',
      icon: 'book',
      completed: false,
      timeHint: '02:30 PM',
    },
    {
      id: 'a3',
      timeSlot: 'afternoon',
      title: 'Quiet Rest Period',
      instruction: 'Relax in a calm room for 20 minutes.',
      icon: 'bed',
      completed: false,
      timeHint: '04:00 PM',
    },
    {
      id: 'e1',
      timeSlot: 'evening',
      title: 'Light Walk & Exercise',
      instruction: 'Take a gentle walk outdoors or stretch indoors.',
      icon: 'walk',
      completed: false,
      timeHint: '06:00 PM',
    },
    {
      id: 'e2',
      timeSlot: 'evening',
      title: 'Family & Creative Time',
      instruction: 'Connect with family, listen to music or draw.',
      icon: 'musical-notes',
      completed: false,
      timeHint: '07:30 PM',
    },
    {
      id: 'n1',
      timeSlot: 'night',
      title: 'Dinner & Medication',
      instruction: 'Have a light dinner and take scheduled evening tablets.',
      icon: 'medkit',
      completed: false,
      timeHint: '08:30 PM',
    },
    {
      id: 'n2',
      timeSlot: 'night',
      title: 'Prepare for Sleep',
      instruction: 'Turn off screens, drink warm water and rest.',
      icon: 'moon',
      completed: false,
      timeHint: '10:00 PM',
    },
  ]);

  const toggleTask = (taskId: string) => {
    triggerHaptic('success');
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleSpeakInstruction = (task: RoutineTask) => {
    triggerHaptic('selection');
    speak(`Task: ${task.title}. One step instruction: ${task.instruction}`);
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const percentage = Math.round((completedTasks / totalTasks) * 100);

  const slotTasks = tasks.filter((t) => t.timeSlot === activeSlot);

  const timeSlots = [
    { id: 'morning', label: 'Morning', icon: 'sunny-outline' },
    { id: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline' },
    { id: 'evening', label: 'Evening', icon: 'cloudy-night-outline' },
    { id: 'night', label: 'Night', icon: 'moon-outline' },
  ];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isHighContrast ? '#000000' : theme.background },
      ]}>
      <HeaderBar showBack title={t('feature4Title')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainContainer}>
          {/* Member 4 Presentation Banner */}
          <View
            style={[
              styles.presenterBanner,
              {
                backgroundColor: isHighContrast ? '#111111' : theme.featureRoutineSurface,
                borderColor: isHighContrast ? '#FFE600' : theme.featureRoutine,
              },
            ]}>
            <View style={styles.bannerRow}>
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: theme.featureRoutine },
                ]}>
                <Ionicons name="calendar" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.presenterTitle,
                    { color: isHighContrast ? '#FFE600' : theme.featureRoutine },
                  ]}>
                  {t('feature4Presenter')}
                </Text>
                <Text
                  style={[
                    styles.presenterSub,
                    { color: isHighContrast ? '#FFFFFF' : theme.text },
                  ]}>
                  Visual Step-by-Step Daily Task Manager
                </Text>
              </View>
            </View>
          </View>

          {/* Daily Completion Progress Card */}
          <View
            style={[
              styles.progressCard,
              {
                backgroundColor: isHighContrast ? '#000000' : theme.card,
                borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                borderWidth: isHighContrast ? 2.5 : 1,
              },
            ]}>
            <View style={styles.progressTop}>
              <View>
                <Text
                  style={[
                    styles.progressHeading,
                    { color: theme.text },
                    isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                  ]}>
                  Daily Progress
                </Text>
                <Text
                  style={[
                    styles.progressSub,
                    { color: theme.textSecondary },
                    isHighContrast && { color: '#FFE600' },
                  ]}>
                  {completedTasks} of {totalTasks} activities completed
                </Text>
              </View>

              <View
                style={[
                  styles.percentCircle,
                  {
                    backgroundColor: isHighContrast ? '#FFE600' : theme.featureRoutine,
                  },
                ]}>
                <Text
                  style={[
                    styles.percentText,
                    { color: isHighContrast ? '#000000' : '#FFFFFF' },
                  ]}>
                  {percentage}%
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.trackBg,
                { backgroundColor: isHighContrast ? '#333333' : theme.backgroundElement },
              ]}>
              <View
                style={[
                  styles.trackFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: isHighContrast ? '#FFE600' : theme.featureRoutine,
                  },
                ]}
              />
            </View>
          </View>

          {/* Time Slot Tabs */}
          <View style={styles.slotTabsRow}>
            {timeSlots.map((slot) => (
              <Pressable
                key={slot.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setActiveSlot(slot.id as any);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeSlot === slot.id }}
                style={[
                  styles.slotTab,
                  {
                    backgroundColor:
                      activeSlot === slot.id
                        ? isHighContrast
                          ? '#FFE600'
                          : theme.featureRoutine
                        : isHighContrast
                        ? '#000000'
                        : theme.card,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                    borderWidth: isHighContrast ? 2 : 1,
                  },
                ]}>
                <Ionicons
                  name={slot.icon as any}
                  size={16}
                  color={
                    activeSlot === slot.id
                      ? isHighContrast
                        ? '#000000'
                        : '#FFFFFF'
                      : theme.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.slotLabel,
                    {
                      color:
                        activeSlot === slot.id
                          ? isHighContrast
                            ? '#000000'
                            : '#FFFFFF'
                          : theme.text,
                      fontWeight: activeSlot === slot.id ? '800' : '600',
                    },
                  ]}>
                  {slot.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Task List */}
          <View style={styles.taskList}>
            {slotTasks.map((task) => (
              <View
                key={task.id}
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: isHighContrast ? '#000000' : theme.card,
                    borderColor: isHighContrast ? '#FFFFFF' : theme.cardBorder,
                    borderWidth: isHighContrast ? 2 : 1,
                    opacity: task.completed ? 0.75 : 1,
                  },
                ]}>
                {/* Checkbox */}
                <Pressable
                  onPress={() => toggleTask(task.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.completed }}
                  accessibilityLabel={`Mark ${task.title} as ${
                    task.completed ? 'incomplete' : 'complete'
                  }`}
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: task.completed
                        ? isHighContrast
                          ? '#FFE600'
                          : theme.featureRoutine
                        : 'transparent',
                      borderColor: isHighContrast ? '#FFE600' : theme.featureRoutine,
                    },
                  ]}>
                  {task.completed && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={isHighContrast ? '#000000' : '#FFFFFF'}
                    />
                  )}
                </Pressable>

                {/* Content */}
                <View style={styles.taskTextCol}>
                  <View style={styles.taskTitleRow}>
                    <Text
                      style={[
                        styles.taskTitle,
                        {
                          color: theme.text,
                          fontSize: 15 * fontScale,
                          textDecorationLine: task.completed ? 'line-through' : 'none',
                        },
                        isHighContrast && { color: '#FFFFFF', fontWeight: '800' },
                      ]}>
                      {task.title}
                    </Text>

                    <View style={styles.timeTag}>
                      <Text
                        style={[
                          styles.timeText,
                          { color: isHighContrast ? '#00FFFF' : theme.textMuted },
                        ]}>
                        {task.timeHint}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.instruction,
                      {
                        color: theme.textSecondary,
                        fontSize: 13 * fontScale,
                      },
                      isHighContrast && { color: '#FFE600' },
                    ]}>
                    {task.instruction}
                  </Text>
                </View>

                {/* Audio Read Button */}
                <Pressable
                  onPress={() => handleSpeakInstruction(task)}
                  accessibilityRole="button"
                  accessibilityLabel={`Read aloud instruction for ${task.title}`}
                  style={({ pressed }) => [
                    styles.audioIconBtn,
                    {
                      backgroundColor: pressed ? theme.backgroundElement : 'transparent',
                      borderColor: isHighContrast ? '#FFE600' : theme.cardBorder,
                    },
                  ]}>
                  <Ionicons
                    name="volume-medium-outline"
                    size={20}
                    color={isHighContrast ? '#FFE600' : theme.primary}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  mainContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  presenterBanner: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1.5,
    marginBottom: Spacing.three,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenterTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  presenterSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressCard: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  progressHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  percentCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 14,
    fontWeight: '900',
  },
  trackBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
  },
  slotTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.three,
  },
  slotTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    minHeight: MinTouchTarget,
  },
  slotLabel: {
    fontSize: 11,
  },
  taskList: {
    gap: Spacing.two,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Radius.lg,
    gap: Spacing.three,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTextCol: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  taskTitle: {
    fontWeight: '700',
    flex: 1,
  },
  timeTag: {
    marginLeft: 6,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  instruction: {
    lineHeight: 18,
    fontWeight: '500',
  },
  audioIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
