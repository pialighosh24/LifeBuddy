import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppButton } from '../../src/components/AppButton';
import { StatusMessage } from '../../src/components/StatusMessage';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { colors, radii, typography } from '../../src/theme';
import { createSosAlert, getCareUserSosAlerts, getEmergencyContacts } from '../../src/services/api/sosApi';
import { ApiError } from '../../src/services/api/client';
import type { EmergencyContact, SosAlert } from '../../src/types/sos';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusLabel(status: SosAlert['alertStatus'], t: (k: any) => string) {
  const map: Record<SosAlert['alertStatus'], string> = {
    created: t('created'),
    pending: t('pending'),
    sent: t('sent'),
    failed: t('failed'),
    acknowledged: t('acknowledged'),
    cancelled: t('cancelled'),
  };
  return map[status] || status;
}

export default function SosScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isCareUser = user?.role === 'user';

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [locationInfo, setLocationInfo] = useState<{ status: 'pending' | 'granted' | 'denied' | 'disabled' | 'unavailable' | 'skipped'; lat?: number; lng?: number } | null>(null);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const clientEventIdRef = useRef<string | null>(null);
  const requestInFlightRef = useRef(false);

  const loadContactsAndHistory = useCallback(async () => {
    if (!isCareUser || !user?.id) return;
    setContactsLoading(true);
    setAlertsLoading(true);
    try {
      const [cRes, aRes] = await Promise.allSettled([
        getEmergencyContacts(user.id),
        getCareUserSosAlerts(user.id),
      ]);
      if (cRes.status === 'fulfilled') setContacts(cRes.value.data.contacts || []);
      if (aRes.status === 'fulfilled') setAlerts((aRes.value.data.alerts || []).slice(0, 50));
    } finally {
      setContactsLoading(false);
      setAlertsLoading(false);
    }
  }, [isCareUser, user?.id]);

  useEffect(() => { loadContactsAndHistory(); }, [loadContactsAndHistory]);

  const generateClientEventId = () => {
    if (clientEventIdRef.current) return clientEventIdRef.current;
    const id = `sos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    clientEventIdRef.current = id;
    return id;
  };

  const tryGetLocation = async (): Promise<{ lat?: number; lng?: number; locationStatus: 'available' | 'unavailable' | 'denied' | 'disabled' }> => {
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationInfo({ status: 'denied' });
        return { locationStatus: 'denied' };
      }
      try {
        const services = await Location.hasServicesEnabledAsync().catch(() => true);
        if (!services) {
          setLocationInfo({ status: 'disabled' });
          return { locationStatus: 'disabled' };
        }
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
        ]);
        const lat = pos.coords?.latitude;
        const lng = pos.coords?.longitude;
        if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
          setLocationInfo({ status: 'granted', lat, lng });
          return { lat, lng, locationStatus: 'available' };
        }
        setLocationInfo({ status: 'unavailable' });
        return { locationStatus: 'unavailable' };
      } catch {
        setLocationInfo({ status: 'unavailable' });
        return { locationStatus: 'unavailable' };
      }
    } catch {
      // expo-location not available
      setLocationInfo({ status: 'unavailable' });
      return { locationStatus: 'unavailable' };
    }
  };

  const onPressSos = () => {
    if (!isCareUser) {
      Alert.alert(t('sosTitle'), language === 'bn' ? 'SOS alert তৈরি শুধুমাত্র কেয়ার-ব্যবহারকারী অ্যাকাউন্টের জন্য উপলব্ধ।' : 'SOS alert creation is available for care-user accounts only.');
      return;
    }
    setLastResult(null);
    setLocationInfo(null);
    setConfirmVisible(true);
  };

  const confirmAndSend = async () => {
    if (requestInFlightRef.current || submitting) {
      Alert.alert(t('sosTitle'), t('duplicateInProgress'));
      return;
    }
    requestInFlightRef.current = true;
    setSubmitting(true);
    setConfirmVisible(false);
    try {
      // Request location only after confirmation
      const loc = await tryGetLocation();
      const clientEventId = generateClientEventId();
      const res = await createSosAlert({
        latitude: loc.lat,
        longitude: loc.lng,
        locationStatus: loc.locationStatus,
        clientEventId,
      });
      const data = res.data;
      if (data?.alert) {
        const msg = loc.locationStatus === 'available' && typeof loc.lat === 'number' ? t('alertSaved') : t('alertSavedWithoutLocation');
        setLastResult({ ok: true, message: msg });
        // refresh history
        loadContactsAndHistory();
      } else {
        setLastResult({ ok: true, message: t('alertSaved') });
        loadContactsAndHistory();
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.isNetworkError || e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT') {
          setLastResult({ ok: false, message: t('cannotSubmitOffline') });
        } else {
          setLastResult({ ok: false, message: e.message || t('alertFailed') });
        }
      } else {
        setLastResult({ ok: false, message: t('alertFailed') });
      }
    } finally {
      setSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  const openTel = async (phone: string) => {
    const url = `tel:${phone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) { Alert.alert(t('sosTitle'), 'Device cannot open the phone dialer for this number.'); return; }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('sosTitle'), 'Unable to open the phone dialer.');
    }
  };
  const openSms = async (phone: string) => {
    const url = `sms:${phone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) { Alert.alert(t('sosTitle'), 'Device cannot open the messaging app for this number.'); return; }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('sosTitle'), 'Unable to open the messaging app.');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('sosEmergencyAssistance')}</Text>
        <Text style={styles.subtitle}>{t('sosDescription')}</Text>
        <StatusMessage type="warning" message={t('sosWarning')} />

        {!isCareUser ? (
          <StatusMessage type="info" message={t('notCareUserSOS')} />
        ) : null}

        <View style={styles.sosWrap}>
          <Pressable
            onPress={onPressSos}
            disabled={submitting || !isCareUser}
            accessibilityRole="button"
            accessibilityLabel={t('sosBigButton')}
            style={({ pressed }) => [styles.sosButton, pressed && !submitting && styles.sosPressed, (submitting || !isCareUser) && styles.sosDisabled]}
          >
            <Ionicons name="alert" size={64} color={colors.white} />
            <Text style={styles.sosText}>{submitting ? t('creatingAlert') : t('sosBigButton')}</Text>
          </Pressable>
        </View>

        {submitting ? <View style={styles.centerRow}><ActivityIndicator size="small" color={colors.danger} /><Text style={styles.muted}>{t('creatingAlert')}</Text></View> : null}
        {lastResult ? <StatusMessage type={lastResult.ok ? 'success' : 'error'} message={lastResult.message} /> : null}

        {locationInfo ? (
          <StatusMessage
            type={locationInfo.status === 'granted' ? 'info' : 'warning'}
            message={locationInfo.status === 'granted' ? t('locationIncluded') : locationInfo.status === 'denied' ? t('locationDenied') : locationInfo.status === 'disabled' ? t('locationDisabled') : t('locationNotAvailable')}
          />
        ) : null}

        <Text style={styles.sectionTitle}>{t('emergencyContacts')}</Text>
        <StatusMessage type="info" message={t('deviceActionOnly')} />
        {contactsLoading ? <Text style={styles.muted}>{t('loading')}</Text> : null}
        {contacts.length === 0 && !contactsLoading ? <StatusMessage type="info" message={t('noEmergencyContacts')} /> : null}
        {contacts.map((c) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.cardTitle}>{c.contactName}{c.isPrimary ? ` ★ ${t('primaryContact')}` : ''}</Text>
            {c.relationshipLabel ? <Text style={styles.cardDesc}>{c.relationshipLabel}</Text> : null}
            <Text style={styles.cardDesc}>{c.phoneNumber}</Text>
            {c.email ? <Text style={styles.cardDesc}>{c.email}</Text> : null}
            <View style={styles.row}>
              <AppButton label={t('callContact')} onPress={() => openTel(c.phoneNumber)} style={styles.half} variant="secondary" />
              <AppButton label={t('messageContact')} onPress={() => openSms(c.phoneNumber)} style={styles.half} variant="outline" />
            </View>
          </View>
        ))}
        {contacts.length > 1 ? <Text style={styles.muted}>{contacts.length} {t('emergencyContacts').toLowerCase()}</Text> : null}

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>{t('alertHistory')}</Text>
          <AppButton
            label={showHistory ? t('hideHistory') : t('viewHistory')}
            variant="outline"
            onPress={() => {
              setShowHistory(v => {
                const next = !v;
                if (next) loadContactsAndHistory();
                return next;
              });
            }}
          />
        </View>
        {showHistory ? (
          <View>
            {alertsLoading ? <Text style={styles.muted}>{t('loading')}</Text> : null}
            {alerts.length === 0 && !alertsLoading ? <StatusMessage type="info" message={t('noPreviousAlerts')} /> : null}
            {alerts.map(a => (
              <View key={a.id} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <Text style={styles.cardTitle}>{t('id')}: {a.id}</Text>
                  <Text style={[styles.badge, a.alertStatus === 'acknowledged' ? styles.badgeOk : a.alertStatus === 'failed' ? styles.badgeBad : styles.badgeWarn]}>{statusLabel(a.alertStatus, t)}</Text>
                </View>
                <Text style={styles.cardDesc}>{t('triggeredAt')}: {formatDate(a.triggeredAt)}</Text>
                <Text style={styles.cardDesc}>{t('locationStatus')}: {a.locationStatus} {a.latitude != null && a.longitude != null ? `(±coords present)` : ''}</Text>
                {a.acknowledgedAt ? <Text style={styles.cardDesc}>{t('acknowledgedAt')}: {formatDate(a.acknowledgedAt)} {a.acknowledgedBy ? `• ${t('acknowledgedBy')}: ${a.acknowledgedBy}` : ''}</Text> : null}
                <Text style={styles.footnote}>{t('sosWarning')}</Text>
              </View>
            ))}
            <AppButton label={t('retryAction')} variant="outline" onPress={loadContactsAndHistory} />
          </View>
        ) : null}

        <AppButton label={t('backToHome')} variant="outline" onPress={() => router.push('/(app)/home')} />
      </ScrollView>

      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('sosConfirmTitle')}</Text>
            <Text style={styles.modalText}>{t('sosConfirmMessage')}</Text>
            <StatusMessage type="warning" message={t('locationPermissionExplain')} />
            <View style={styles.modalRow}>
              <AppButton label={t('cancel')} variant="outline" onPress={() => setConfirmVisible(false)} style={styles.modalBtn} />
              <AppButton label={t('confirmSos')} variant="danger" onPress={confirmAndSend} style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { ...typography.heading, color: colors.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  sosWrap: { alignItems: 'center', marginVertical: 16 },
  sosButton: { width: 220, height: 220, borderRadius: 110, backgroundColor: colors.sos, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#FCA5A5' },
  sosPressed: { backgroundColor: colors.sosPressed },
  sosDisabled: { backgroundColor: colors.disabled, borderColor: colors.border },
  sosText: { color: colors.white, fontSize: 26, fontWeight: '800', marginTop: 6 },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  muted: { color: colors.textMuted },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  half: { flex: 1 },
  sectionTitle: { ...typography.subheading, color: colors.text, marginTop: 12, marginBottom: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, padding: 12, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardDesc: { color: colors.textMuted, marginTop: 2 },
  footnote: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  historyCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, overflow: 'hidden', fontWeight: '700', fontSize: 13 },
  badgeOk: { backgroundColor: colors.successLight, color: colors.success },
  badgeWarn: { backgroundColor: colors.warningLight, color: colors.warning },
  badgeBad: { backgroundColor: colors.dangerLight, color: colors.danger },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, width: '100%', maxWidth: 420 },
  modalTitle: { ...typography.subheading, color: colors.text, marginBottom: 6 },
  modalText: { ...typography.body, color: colors.text },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalBtn: { flex: 1 },
});
