import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { AppTextInput } from '../../src/components/AppTextInput';
import { AppButton } from '../../src/components/AppButton';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useAuth } from '../../src/context/AuthContext';
import { ApiError, getValidationMessages } from '../../src/services/api/client';
import { colors, typography } from '../../src/theme';

export default function CaregiverLoginScreen() {
  const { signInCaregiver } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = 'Password is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async () => {
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await signInCaregiver({ email: email.trim(), password });
    } catch (e) {
      if (e instanceof ApiError) {
        const details = getValidationMessages(e.details);
        setError(details || e.message);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Life Buddy</Text>
      <Text style={styles.subtitle}>Caregiver sign in</Text>
      <Text style={styles.help}>Sign in with your caregiver email and password to manage and support linked care users.</Text>

      {error ? <StatusMessage type="error" message={error} /> : null}

      <AppTextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="name@example.com"
        error={fieldErrors.email}
      />

      <AppTextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        placeholder="Enter your password"
        error={fieldErrors.password}
      />

      <Pressable
        onPress={() => setShowPassword(s => !s)}
        accessibilityRole="button"
        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>{showPassword ? 'Hide password' : 'Show password'}</Text>
      </Pressable>

      <AppButton label={loading ? 'Signing in...' : 'Sign in'} onPress={onSubmit} loading={loading} disabled={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Care user?</Text>
        <Link href="/(auth)/user-pin-login" asChild>
          <Pressable accessibilityRole="link"><Text style={styles.link}>Use PIN login</Text></Pressable>
        </Link>
      </View>

      <StatusMessage type="info" message="Connection issues? Ensure EXPO_PUBLIC_API_BASE_URL points to your backend (Android emulator: http://10.0.2.2:4000, physical device: your computer LAN IP)." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.primary, marginBottom: 4 },
  subtitle: { ...typography.heading, color: colors.text, marginBottom: 8 },
  help: { ...typography.body, color: colors.textMuted, marginBottom: 16 },
  toggle: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 8 },
  toggleText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  footer: { marginTop: 20, alignItems: 'center', gap: 6 },
  footerText: { color: colors.textMuted, fontSize: 15 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 16 },
});
