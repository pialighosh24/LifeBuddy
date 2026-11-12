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

export default function UserPinLoginScreen() {
  const { signInUserWithPin } = useAuth();
  const [careUserId, setCareUserId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ careUserId?: string; pin?: string }>({});

  const validate = () => {
    const errs: { careUserId?: string; pin?: string } = {};
    const idNum = Number(careUserId);
    if (!careUserId.trim() || !Number.isInteger(idNum) || idNum < 1) errs.careUserId = 'Enter a valid care user ID.';
    if (!pin) errs.pin = 'PIN is required.';
    else if (!/^\d{4,8}$/.test(pin)) errs.pin = 'PIN must be 4–8 digits.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async () => {
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await signInUserWithPin({ careUserId: Number(careUserId), pin });
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
      <Text style={styles.title}>Care User Login</Text>
      <Text style={styles.help}>Enter the care user ID and PIN set by a caregiver. Your PIN is used only to sign in and is never stored on this device.</Text>

      {error ? <StatusMessage type="error" message={error} /> : null}

      <AppTextInput
        label="Care User ID"
        value={careUserId}
        onChangeText={setCareUserId}
        keyboardType="number-pad"
        placeholder="e.g. 123"
        error={fieldErrors.careUserId}
      />

      <AppTextInput
        label="PIN (4–8 digits)"
        value={pin}
        onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 8))}
        keyboardType="number-pad"
        secureTextEntry={!showPin}
        placeholder="Enter PIN"
        error={fieldErrors.pin}
        maxLength={8}
      />

      <Pressable
        onPress={() => setShowPin(s => !s)}
        accessibilityRole="button"
        accessibilityLabel={showPin ? 'Hide PIN' : 'Show PIN'}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>{showPin ? 'Hide PIN' : 'Show PIN'}</Text>
      </Pressable>

      <AppButton label={loading ? 'Signing in...' : 'Sign in with PIN'} onPress={onSubmit} loading={loading} disabled={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Caregiver?</Text>
        <Link href="/(auth)/caregiver-login" asChild>
          <Pressable accessibilityRole="link"><Text style={styles.link}>Go to caregiver login</Text></Pressable>
        </Link>
      </View>

      <StatusMessage type="info" message="If sign-in fails, confirm the care user ID and PIN were set by a linked caregiver and the backend server is reachable." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text, marginBottom: 8 },
  help: { ...typography.body, color: colors.textMuted, marginBottom: 16 },
  toggle: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 8 },
  toggleText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  footer: { marginTop: 20, alignItems: 'center', gap: 6 },
  footerText: { color: colors.textMuted, fontSize: 15 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 16 },
});
