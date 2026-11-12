import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="home" options={{ title: 'Life Buddy' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile & Session' }} />
      <Stack.Screen name="talk" options={{ title: 'Talk' }} />
      <Stack.Screen name="my-day" options={{ title: 'My Day' }} />
      <Stack.Screen name="routine/[routineId]" options={{ title: 'Routine' }} />
      <Stack.Screen name="medicine" options={{ title: 'Medicine' }} />
      <Stack.Screen name="medicine/[medicineId]" options={{ title: 'Medicine Details' }} />
      <Stack.Screen name="my-feelings" options={{ title: 'My Feelings' }} />
      <Stack.Screen name="help-me" options={{ title: 'Help Me' }} />
      <Stack.Screen name="situation/[situationKey]" options={{ title: 'Situation' }} />
      <Stack.Screen name="sos" options={{ title: 'SOS' }} />
      <Stack.Screen name="emergency-contacts" options={{ title: 'Emergency Contacts' }} />
      <Stack.Screen name="appointments" options={{ title: 'Appointments' }} />
      <Stack.Screen name="tasks" options={{ title: 'Daily Tasks' }} />
      <Stack.Screen name="help-guide" options={{ title: 'Help & User Guide' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy Information' }} />
      <Stack.Screen name="accessibility-settings" options={{ title: 'Accessibility' }} />
    </Stack>
  );
}
