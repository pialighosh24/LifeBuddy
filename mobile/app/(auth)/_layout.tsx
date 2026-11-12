import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="caregiver-login" options={{ title: 'Caregiver Login' }} />
      <Stack.Screen name="user-pin-login" options={{ title: 'Care User PIN Login' }} />
    </Stack>
  );
}
