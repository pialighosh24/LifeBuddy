import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { getEmergencyContacts } from '../../src/services/api/sosApi';
import { ApiError } from '../../src/services/api/client';
import type { EmergencyContact } from '../../src/types/sos';
import { colors, radii, typography } from '../../src/theme';

export default function EmergencyContactsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const careUserId = user?.role === 'user' ? user.id : null;
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!careUserId) { setLoading(false); setRefreshing(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await getEmergencyContacts(careUserId);
      setContacts(res.data.contacts || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('networkError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [careUserId, t]);

  useEffect(() => { load(); }, [load]);

  const openTel = async (phone: string) => {
    try { const ok = await Linking.canOpenURL(`tel:${phone}`); if (!ok) { Alert.alert(t('error'), 'Cannot open dialer.'); return; } await Linking.openURL(`tel:${phone}`); }
    catch { Alert.alert(t('error'), 'Cannot open dialer.'); }
  };
  const openSms = async (phone: string) => {
    try { const ok = await Linking.canOpenURL(`sms:${phone}`); if (!ok) { Alert.alert(t('error'), 'Cannot open messages.'); return; } await Linking.openURL(`sms:${phone}`); }
    catch { Alert.alert(t('error'), 'Cannot open messages.'); }
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <Text style={styles.title}>{t('emergencyContactsTitle')}</Text>
        <StatusMessage type="info" message={t('deviceActionOnly')} />
        <StatusMessage type="info" message={t('readOnlyContactsNote')} />

        {!careUserId ? <StatusMessage type="info" message={t('summaryUnavailable')} /> : null}
        {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.meta}>{t('loading')}</Text></View> : null}
        {error ? <StatusMessage type="error" message={error} /> : null}
        {!loading && !error && careUserId && contacts.length === 0 ? <StatusMessage type="info" message={t('noEmergencyContacts')} /> : null}

        {contacts.map(c => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.cardTitle}>{c.contactName}{c.isPrimary ? ` ★ ${t('primaryContact')}` : ''}</Text>
            {c.relationshipLabel ? <Text style={styles.meta}>{c.relationshipLabel}</Text> : null}
            <Text style={styles.meta}>{c.phoneNumber}</Text>
            {c.email ? <Text style={styles.meta}>{c.email}</Text> : null}
            <View style={styles.row}>
              <AppButton label={t('callNow')} onPress={() => openTel(c.phoneNumber)} style={styles.half} variant="secondary" />
              <AppButton label={t('messageNow')} onPress={() => openSms(c.phoneNumber)} style={styles.half} variant="outline" />
            </View>
          </View>
        ))}

        {careUserId ? <AppButton label={t('retryAction')} variant="outline" onPress={() => load(true)} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { ...typography.heading, color: colors.text, marginBottom: 8 },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  half: { flex: 1 },
});
