import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, getValidationMessages } from '../services/apiClient';
import { getLinkedCareUsers } from '../services/careUserApi';
import { getCareUserPreferences, getMyProfile, updateCareUserPreferences, updateMyProfile } from '../services/profileApi';
import type { CareUser } from '../types/auth';
import type { UpdatePreferencesPayload, UpdateProfilePayload, UserPreferences, UserProfile } from '../types/profile';

function careUserLabel(u: CareUser) { return `${u.displayName || u.fullName || `Care user #${u.id}`} (#${u.id})`; }

export function SettingsPage() {
  const { sessionStatus } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = Number(searchParams.get('careUserId'));

  // Caregiver account/profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileInfo, setProfileInfo] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'bn'>('en');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Care-user preferences
  const [careUsers, setCareUsers] = useState<CareUser[] | null>(null);
  const [cuLoading, setCuLoading] = useState(true);
  const [cuError, setCuError] = useState<string | null>(null);
  const [selectedCareUserId, setSelectedCareUserId] = useState<number | ''>('');
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [prefsInfo, setPrefsInfo] = useState<string | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsFieldError, setPrefsFieldError] = useState<string | null>(null);

  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [textSize, setTextSize] = useState<UserPreferences['textSize']>('large');
  const [contrastMode, setContrastMode] = useState<UserPreferences['contrastMode']>('high');
  const [speechRate, setSpeechRate] = useState<number>(1);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const selectedCareUser = useMemo(() => (careUsers || []).find(u => u.id === selectedCareUserId) || null, [careUsers, selectedCareUserId]);

  const loadProfile = useCallback(async () => {
    if (sessionStatus === 'offline_unverified') {
      setProfileLoading(false);
      setProfileError('Cannot load account information while session verification is pending. Please retry when connected.');
      return;
    }
    setProfileLoading(true); setProfileError(null);
    try {
      const res = await getMyProfile();
      const p = res.data.profile;
      setProfile(p);
      setFullName(p.fullName || '');
      setDisplayName(p.displayName || '');
      setPreferredLanguage((p.preferredLanguage === 'bn' ? 'bn' : 'en'));
      setPhoneNumber(p.phoneNumber || '');
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setProfileError('Your session is no longer valid. Please sign in again.');
        else setProfileError(e.message || 'Unable to load account information.');
      } else setProfileError('Unable to load account information.');
    } finally { setProfileLoading(false); }
  }, [sessionStatus]);

  const loadCareUsers = useCallback(async () => {
    if (sessionStatus === 'offline_unverified') { setCuLoading(false); setCuError('Cannot load linked care users while session verification is pending.'); return; }
    setCuLoading(true); setCuError(null);
    try {
      const res = await getLinkedCareUsers();
      const list = res.data.careUsers || [];
      setCareUsers(list);
      if (list.length) {
        const wanted = Number.isFinite(requestedId) && requestedId > 0 && list.some(u => u.id === requestedId) ? requestedId : list[0].id;
        setSelectedCareUserId(prev => (prev && list.some(u => u.id === prev) ? prev : wanted));
      } else setSelectedCareUserId('');
    } catch (e) {
      setCuError(e instanceof ApiError ? (e.message || 'Unable to load linked care users.') : 'Unable to load linked care users.');
      setCareUsers(null);
    } finally { setCuLoading(false); }
  }, [sessionStatus, requestedId]);

  const applyPrefsToForm = (p: UserPreferences) => {
    setLanguage(p.language);
    setTextSize(p.textSize);
    setContrastMode(p.contrastMode);
    setSpeechRate(Number(p.speechRate));
    setVoiceEnabled(!!p.voiceEnabled);
    setReducedMotion(!!p.reducedMotion);
    setNotificationsEnabled(!!p.notificationsEnabled);
  };

  const loadPreferences = useCallback(async (careUserId: number) => {
    if (sessionStatus === 'offline_unverified') {
      setPrefsError('Cannot load preferences while session verification is pending. Please retry when connected.');
      setPrefs(null); return;
    }
    setPrefsLoading(true); setPrefsError(null);
    try {
      const res = await getCareUserPreferences(careUserId);
      setPrefs(res.data.preferences);
      applyPrefsToForm(res.data.preferences);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setPrefsError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setPrefsError('You are not authorized to view preferences for this care user.');
        else if (e.status === 404) setPrefsError('Care user or preferences not found.');
        else setPrefsError(e.message || 'Unable to load preferences.');
      } else setPrefsError('Unable to load preferences.');
      setPrefs(null);
    } finally { setPrefsLoading(false); }
  }, [sessionStatus]);

  useEffect(() => { loadProfile(); loadCareUsers(); }, [loadProfile, loadCareUsers]);
  useEffect(() => {
    if (typeof selectedCareUserId === 'number' && selectedCareUserId > 0) {
      setPrefsInfo(null);
      loadPreferences(selectedCareUserId);
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('careUserId', String(selectedCareUserId)); return p; }, { replace: true });
    } else { setPrefs(null); setPrefsError(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCareUserId]);

  const validateProfile = () => {
    const errs: Record<string, string> = {};
    if (fullName.trim() && fullName.trim().length < 2) errs.fullName = 'Full name must be at least 2 characters.';
    if (fullName.trim().length > 150) errs.fullName = 'Full name must be 150 characters or fewer.';
    if (displayName.trim().length > 100) errs.displayName = 'Display name must be 100 characters or fewer.';
    if (phoneNumber.trim().length > 30) errs.phoneNumber = 'Phone number must be 30 characters or fewer.';
    setProfileFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileSaving) return;
    setProfileInfo(null); setProfileError(null);
    if (!validateProfile()) return;
    const payload: UpdateProfilePayload = {};
    if (fullName.trim()) payload.fullName = fullName.trim();
    payload.displayName = displayName.trim() ? displayName.trim() : null;
    payload.preferredLanguage = preferredLanguage;
    payload.phoneNumber = phoneNumber.trim() ? phoneNumber.trim() : null;
    if (Object.keys(payload).length === 0) { setProfileError('No permitted fields provided for update.'); return; }
    setProfileSaving(true);
    try {
      const res = await updateMyProfile(payload);
      setProfile(res.data.profile);
      setFullName(res.data.profile.fullName || '');
      setDisplayName(res.data.profile.displayName || '');
      setPreferredLanguage(res.data.profile.preferredLanguage === 'bn' ? 'bn' : 'en');
      setPhoneNumber(res.data.profile.phoneNumber || '');
      setProfileInfo('Account information updated successfully (confirmed by server). Note: this updates your backend profile fields; mobile app language may be managed separately on-device.');
    } catch (e) {
      if (e instanceof ApiError) setProfileError(getValidationMessages(e.details) || e.message || 'Unable to update account information.');
      else setProfileError('Unable to update account information.');
    } finally { setProfileSaving(false); }
  };

  const onSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prefsSaving || typeof selectedCareUserId !== 'number') return;
    setPrefsInfo(null); setPrefsError(null); setPrefsFieldError(null);
    const rate = Number(speechRate);
    if (!Number.isFinite(rate) || rate < 0.5 || rate > 2.0) { setPrefsFieldError('Speech rate must be between 0.50 and 2.00.'); return; }
    const payload: UpdatePreferencesPayload = {
      language, textSize, contrastMode, speechRate: Number(rate.toFixed(2)), voiceEnabled, reducedMotion, notificationsEnabled,
    };
    setPrefsSaving(true);
    try {
      const res = await updateCareUserPreferences(selectedCareUserId, payload);
      setPrefs(res.data.preferences);
      applyPrefsToForm(res.data.preferences);
      setPrefsInfo('Care-user preferences updated successfully (confirmed by server and stored in MySQL). Mobile behavior changes only if the mobile app consumes these preference fields.');
    } catch (e) {
      if (e instanceof ApiError) setPrefsError(getValidationMessages(e.details) || e.message || 'Unable to update preferences.');
      else setPrefsError('Unable to update preferences.');
    } finally { setPrefsSaving(false); }
  };

  return (
    <div className="page">
      {profileInfo ? <div className="alert alert-success" role="status">{profileInfo}</div> : null}
      {prefsInfo ? <div className="alert alert-success" role="status">{prefsInfo}</div> : null}

      <section className="card">
        <div className="card-header-row">
          <div>
            <h2>Settings & Preferences</h2>
            <p className="muted">Manage your caregiver account information and supported care-user preferences using existing backend/MySQL APIs. Only real, supported settings are shown (no fake toggles, no notification delivery claims, no localStorage persistence as substitute for DB).</p>
          </div>
          <div className="row-actions">
            <button className="btn btn-outline" onClick={loadProfile} disabled={profileLoading}>Refresh account</button>
            <button className="btn btn-outline" onClick={loadCareUsers} disabled={cuLoading}>Refresh care users</button>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Caregiver account information</h3>
        <p className="muted">Authenticated profile retrieved via <code>GET /api/v1/profile</code>. Editable fields supported by <code>PATCH /api/v1/profile</code>: full name, display name, preferred language, phone number. No password/token/hash/credential changes exposed (not supported here).</p>
        {profileLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading account information…</div>
        : profileError ? <div><div className="alert alert-error" role="alert">{profileError}</div><button className="btn btn-primary btn-sm" onClick={loadProfile}>Retry</button></div>
        : profile ? (
          <div>
            <dl className="details" style={{ marginBottom: 12 }}>
              <div><dt>User ID</dt><dd>{profile.id}</dd></div>
              <div><dt>Role</dt><dd>{profile.role}</dd></div>
              <div><dt>Email</dt><dd>{profile.email || '—'}</dd></div>
              <div><dt>Status</dt><dd>{profile.status || '—'}</dd></div>
            </dl>
            <form onSubmit={onSaveProfile} noValidate className="form-grid">
              <div className="field"><label htmlFor="p-full">Full name</label><input id="p-full" value={fullName} onChange={e => setFullName(e.target.value)} disabled={profileSaving} />{profileFieldErrors.fullName ? <div className="field-error">{profileFieldErrors.fullName}</div> : null}</div>
              <div className="field"><label htmlFor="p-disp">Display name</label><input id="p-disp" value={displayName} onChange={e => setDisplayName(e.target.value)} disabled={profileSaving} placeholder="Optional" />{profileFieldErrors.displayName ? <div className="field-error">{profileFieldErrors.displayName}</div> : null}</div>
              <div className="field"><label htmlFor="p-lang">Preferred language (profile)</label><select id="p-lang" value={preferredLanguage} onChange={e => setPreferredLanguage(e.target.value as 'en'|'bn')} disabled={profileSaving}><option value="en">English (en)</option><option value="bn">Bengali (bn)</option></select><div className="muted small">Backend profile field. Mobile app language is stored separately on-device in current mobile implementation.</div></div>
              <div className="field"><label htmlFor="p-phone">Phone number</label><input id="p-phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} disabled={profileSaving} placeholder="Optional" />{profileFieldErrors.phoneNumber ? <div className="field-error">{profileFieldErrors.phoneNumber}</div> : null}</div>
              <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save account information'}</button></div>
            </form>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="card-header-row">
          <div>
            <h3 style={{ marginTop: 0 }}>Care-user preferences (linked care users)</h3>
            <p className="muted">Preferences are stored per user in <code>user_preferences</code> and managed via <code>GET/PUT /api/v1/care-users/:id/preferences</code>. Linked caregivers can view/update preferences for authorized care users (backend enforced). This is <strong>care-user preference management</strong>, not caregiver-only dashboard preferences and not a guarantee of mobile behavior change unless the mobile app consumes these fields. <strong>Notifications enabled</strong> is a stored preference flag only — no notification delivery (browser/Expo/SMS/email) is implemented or claimed.</p>
          </div>
        </div>

        {cuLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading linked care users…</div>
        : cuError ? <div><div className="alert alert-error" role="alert">{cuError}</div><button className="btn btn-primary btn-sm" onClick={loadCareUsers}>Retry</button></div>
        : !careUsers || careUsers.length === 0 ? <div className="empty-state"><p><strong>No linked care users found.</strong></p><p className="muted">Cannot manage care-user preferences without a linked care user. No data fabricated.</p></div>
        : (
          <div className="filters" style={{ marginTop: 8 }}>
            <label className="filter-item" style={{ maxWidth: 520 }}><span>Care user</span>
              <select value={selectedCareUserId} onChange={e => setSelectedCareUserId(e.target.value ? Number(e.target.value) : '')} aria-label="Select care user for preferences">
                <option value="" disabled>Select a care user…</option>
                {careUsers.map(u => <option key={u.id} value={u.id}>{careUserLabel(u)}</option>)}
              </select>
            </label>
            {selectedCareUser ? <div className="muted small" style={{ alignSelf: 'end' }}>Managing preferences for <strong>{careUserLabel(selectedCareUser)}</strong> (real backend/MySQL data).</div> : null}
          </div>
        )}
      </section>

      {typeof selectedCareUserId === 'number' ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Preference values</h3>
          {prefsLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading preferences…</div>
          : prefsError ? <div><div className="alert alert-error" role="alert">{prefsError}</div><button className="btn btn-primary btn-sm" onClick={() => loadPreferences(selectedCareUserId)}>Retry</button></div>
          : prefs ? (
            <form onSubmit={onSavePreferences} noValidate className="form-grid">
              {prefsFieldError ? <div className="alert alert-error" role="alert" style={{ gridColumn: '1 / -1' }}>{prefsFieldError}</div> : null}
              <div className="field"><label htmlFor="pref-lang">Language</label><select id="pref-lang" value={language} onChange={e => setLanguage(e.target.value as 'en'|'bn')} disabled={prefsSaving}><option value="en">English (en)</option><option value="bn">Bengali (bn)</option></select></div>
              <div className="field"><label htmlFor="pref-text">Text size</label><select id="pref-text" value={textSize} onChange={e => setTextSize(e.target.value as any)} disabled={prefsSaving}><option value="small">small</option><option value="medium">medium</option><option value="large">large</option><option value="xlarge">xlarge</option></select></div>
              <div className="field"><label htmlFor="pref-contrast">Contrast mode</label><select id="pref-contrast" value={contrastMode} onChange={e => setContrastMode(e.target.value as any)} disabled={prefsSaving}><option value="normal">normal</option><option value="high">high</option></select></div>
              <div className="field"><label htmlFor="pref-rate">Speech rate (0.50–2.00)</label><input id="pref-rate" type="number" min={0.5} max={2} step={0.05} value={speechRate} onChange={e => setSpeechRate(Number(e.target.value))} disabled={prefsSaving} /></div>
              <div className="field"><label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={voiceEnabled} onChange={e => setVoiceEnabled(e.target.checked)} disabled={prefsSaving} /> Voice enabled</label></div>
              <div className="field"><label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} disabled={prefsSaving} /> Reduced motion</label></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={notificationsEnabled} onChange={e => setNotificationsEnabled(e.target.checked)} disabled={prefsSaving} /> Notifications enabled (stored preference flag only — no delivery implemented/claimed)</label></div>
              <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={prefsSaving}>{prefsSaving ? 'Saving…' : 'Save preferences'}</button><button type="button" className="btn btn-outline" onClick={() => prefs && applyPrefsToForm(prefs)} disabled={prefsSaving}>Reset to loaded values</button></div>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Session & application information</h3>
        <ul className="notes">
          <li><strong>Authentication:</strong> Bearer JWT in sessionStorage (existing behavior). No token/password/secret exposure. Logout uses existing session flow (stateless backend logout).</li>
          <li><strong>Unsupported in current contracts (not implemented):</strong> password change/reset, caregiver-owned accessibility preference endpoint, theme/display sync to backend, notification delivery (browser/Expo/SMS/email), token revocation/invented session controls.</li>
          <li><strong>Application:</strong> Life Buddy caregiver dashboard (academic project). No production-readiness or release guarantees claimed.</li>
        </ul>
      </section>
    </div>
  );
}
