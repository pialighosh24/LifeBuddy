import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, getValidationMessages } from '../services/apiClient';
import { createCareUser, getCareUser, getLinkedCareUsers, setCareUserPin, updateCareUser, type CreateCareUserPayload, type UpdateCareUserPayload } from '../services/careUserApi';
import type { CareUser } from '../types/auth';

type Mode = 'list' | 'create' | 'detail' | 'edit';

function displayName(cu: CareUser) {
  return cu.displayName || cu.fullName || `Care user #${cu.id}`;
}

export function CareUsersPage() {
  const { sessionStatus } = useAuth();
  const [mode, setMode] = useState<Mode>('list');
  const [users, setUsers] = useState<CareUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CareUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // create/edit form state
  const [fullName, setFullName] = useState('');
  const [cuDisplayName, setCuDisplayName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'bn'>('en');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // PIN
  const [pinOpen, setPinOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const resetForm = () => {
    setFullName(''); setCuDisplayName(''); setPreferredLanguage('en'); setPhoneNumber(''); setRelationshipType(''); setStatus('active');
    setFormError(null); setFieldErrors({});
  };

  const loadList = useCallback(async () => {
    if (sessionStatus === 'offline_unverified') {
      setLoading(false);
      setError('Cannot load care users while session verification is pending. Please retry when connected.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await getLinkedCareUsers();
      setUsers(res.data.careUsers || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setError('You are not authorized to view care users.');
        else setError(e.message || 'Unable to load care users.');
      } else setError('Unable to load care users.');
      setUsers(null);
    } finally { setLoading(false); }
  }, [sessionStatus]);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true); setDetailError(null);
    try {
      const res = await getCareUser(id);
      setDetail(res.data.careUser);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setDetailError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setDetailError('You are not authorized to view this care user.');
        else if (e.status === 404) setDetailError('Care user not found or not linked to your account.');
        else setDetailError(e.message || 'Unable to load care-user details.');
      } else setDetailError('Unable to load care-user details.');
      setDetail(null);
    } finally { setDetailLoading(false); }
  }, []);

  const openDetail = (id: number) => { setSelectedId(id); setMode('detail'); setInfo(null); setPinOpen(false); loadDetail(id); };
  const openCreate = () => { resetForm(); setMode('create'); setInfo(null); };
  const openEdit = () => {
    if (!detail) return;
    setFullName(detail.fullName || '');
    setCuDisplayName(detail.displayName || '');
    setPreferredLanguage((detail.preferredLanguage === 'bn' ? 'bn' : 'en'));
    setPhoneNumber(detail.phoneNumber || '');
    setStatus(detail.status === 'inactive' ? 'inactive' : 'active');
    setFormError(null); setFieldErrors({}); setMode('edit'); setInfo(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || []).filter(u => {
      if (statusFilter !== 'all' && (u.status || '').toLowerCase() !== statusFilter) return false;
      if (!q) return true;
      const hay = `${u.id} ${u.fullName || ''} ${u.displayName || ''} ${u.email || ''} ${u.phoneNumber || ''} ${u.link?.relationshipType || ''} ${u.preferredLanguage || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, search, statusFilter]);

  const validateCreate = () => {
    const errs: Record<string, string> = {};
    const name = fullName.trim();
    if (!name) errs.fullName = 'Full name is required.';
    else if (name.length < 2 || name.length > 150) errs.fullName = 'Full name must be 2-150 characters.';
    if (cuDisplayName && cuDisplayName.trim().length > 100) errs.displayName = 'Display name must be 100 characters or fewer.';
    if (phoneNumber && phoneNumber.trim().length > 30) errs.phoneNumber = 'Phone number must be 30 characters or fewer.';
    if (relationshipType && relationshipType.trim().length > 50) errs.relationshipType = 'Relationship type must be 50 characters or fewer.';
    setFieldErrors(errs); return Object.keys(errs).length === 0;
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting) return;
    setFormError(null); setInfo(null);
    if (!validateCreate()) return;
    const payload: CreateCareUserPayload = { fullName: fullName.trim(), preferredLanguage };
    if (cuDisplayName.trim()) payload.displayName = cuDisplayName.trim();
    if (phoneNumber.trim()) payload.phoneNumber = phoneNumber.trim();
    if (relationshipType.trim()) payload.relationshipType = relationshipType.trim();
    setFormSubmitting(true);
    try {
      const res = await createCareUser(payload);
      setInfo('Care user created and linked successfully.');
      resetForm();
      setMode('list');
      await loadList();
      if (res.data.careUser?.id) openDetail(res.data.careUser.id);
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to create care user.');
      else setFormError('Unable to create care user.');
    } finally { setFormSubmitting(false); }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting || !selectedId) return;
    setFormError(null); setInfo(null);
    const errs: Record<string, string> = {};
    const name = fullName.trim();
    if (!name) errs.fullName = 'Full name is required.';
    else if (name.length < 2 || name.length > 150) errs.fullName = 'Full name must be 2-150 characters.';
    if (cuDisplayName && cuDisplayName.trim().length > 100) errs.displayName = 'Display name must be 100 characters or fewer.';
    if (phoneNumber && phoneNumber.trim().length > 30) errs.phoneNumber = 'Phone number must be 30 characters or fewer.';
    setFieldErrors(errs); if (Object.keys(errs).length) return;
    const payload: UpdateCareUserPayload = {
      fullName: name,
      displayName: cuDisplayName.trim() ? cuDisplayName.trim() : null,
      preferredLanguage,
      phoneNumber: phoneNumber.trim() ? phoneNumber.trim() : null,
      status,
    };
    setFormSubmitting(true);
    try {
      await updateCareUser(selectedId, payload);
      setInfo('Care user updated successfully.');
      setMode('detail');
      await Promise.all([loadDetail(selectedId), loadList()]);
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to update care user.');
      else setFormError('Unable to update care user.');
    } finally { setFormSubmitting(false); }
  };

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinSubmitting || !selectedId) return;
    setPinError(null); setInfo(null);
    if (!/^\d{4,8}$/.test(pinValue)) { setPinError('PIN must be 4-8 digits.'); return; }
    if (pinValue !== pinConfirm) { setPinError('PIN and confirmation do not match.'); return; }
    if (!window.confirm('Set/update this care user\'s PIN now? The existing PIN (if any) will be replaced.')) return;
    setPinSubmitting(true);
    try {
      await setCareUserPin(selectedId, pinValue);
      setPinValue(''); setPinConfirm(''); setPinOpen(false);
      setInfo('Care-user PIN set successfully (confirmed by server).');
      await Promise.all([loadDetail(selectedId), loadList()]);
    } catch (e) {
      if (e instanceof ApiError) setPinError(getValidationMessages(e.details) || e.message || 'Unable to set PIN.');
      else setPinError('Unable to set PIN.');
    } finally { setPinSubmitting(false); }
  };

  return (
    <div className="page">
      {info ? <div className="alert alert-success" role="status">{info}</div> : null}

      {mode === 'list' ? (
        <section className="card">
          <div className="card-header-row">
            <div>
              <h2>Care Users</h2>
              <p className="muted">Linked care users retrieved from the backend. Counts and records are based only on real API responses.</p>
            </div>
            <div className="row-actions">
              <button className="btn btn-outline" onClick={loadList} disabled={loading}>Refresh</button>
              <button className="btn btn-primary" onClick={openCreate}>Create care user</button>
            </div>
          </div>

          <div className="filters">
            <label className="filter-item">
              <span>Search (fetched data)</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, ID, phone, relationship…" />
            </label>
            <label className="filter-item">
              <span>Status</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="inline-loading" role="status" aria-live="polite"><span className="spinner sm" aria-hidden="true" /> Loading care users…</div>
          ) : error ? (
            <div>
              <div className="alert alert-error" role="alert">{error}</div>
              <button className="btn btn-primary btn-sm" onClick={loadList}>Retry</button>
            </div>
          ) : users && users.length === 0 ? (
            <div className="empty-state">
              <p><strong>No linked care users found.</strong></p>
              <p className="muted">The server returned an empty list. Use “Create care user” to add and link a care user (if authorized). No users are fabricated.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><p>No care users match the current search/filter (applied over fetched data).</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Phone</th><th>Relationship</th><th>Language</th><th>Status</th><th>Link</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="cu-name">{displayName(u)}</div>
                        <div className="muted small">ID: {u.id}{u.email ? ` · ${u.email}` : ''}</div>
                      </td>
                      <td>{u.phoneNumber || '—'}</td>
                      <td>{u.link?.relationshipType || '—'}</td>
                      <td>{u.preferredLanguage || '—'}</td>
                      <td><span className={`status-badge ${u.status === 'active' ? 'ok' : 'muted-b'}`}>{u.status || 'unknown'}</span></td>
                      <td>{u.link?.linkStatus || '—'}</td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => openDetail(u.id)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">Showing {filtered.length} of {users?.length || 0} fetched care user(s).</p>
            </div>
          )}
        </section>
      ) : null}

      {mode === 'create' ? (
        <section className="card">
          <h2>Create care user</h2>
          <p className="muted">Creates and links a care user using the backend API. Only supported fields are submitted.</p>
          {formError ? <div className="alert alert-error" role="alert">{formError}</div> : null}
          <form onSubmit={submitCreate} noValidate className="form-grid">
            <div className="field"><label htmlFor="cu-fullName">Full name *</label><input id="cu-fullName" value={fullName} onChange={e=>setFullName(e.target.value)} disabled={formSubmitting} required aria-invalid={!!fieldErrors.fullName} />{fieldErrors.fullName ? <div className="field-error">{fieldErrors.fullName}</div> : null}</div>
            <div className="field"><label htmlFor="cu-displayName">Display name</label><input id="cu-displayName" value={cuDisplayName} onChange={e=>setCuDisplayName(e.target.value)} disabled={formSubmitting} />{fieldErrors.displayName ? <div className="field-error">{fieldErrors.displayName}</div> : null}</div>
            <div className="field"><label htmlFor="cu-lang">Preferred language</label><select id="cu-lang" value={preferredLanguage} onChange={e=>setPreferredLanguage(e.target.value as any)} disabled={formSubmitting}><option value="en">English (en)</option><option value="bn">Bengali (bn)</option></select></div>
            <div className="field"><label htmlFor="cu-phone">Phone number</label><input id="cu-phone" value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)} disabled={formSubmitting} />{fieldErrors.phoneNumber ? <div className="field-error">{fieldErrors.phoneNumber}</div> : null}</div>
            <div className="field"><label htmlFor="cu-rel">Relationship type</label><input id="cu-rel" value={relationshipType} onChange={e=>setRelationshipType(e.target.value)} disabled={formSubmitting} placeholder="e.g. parent, guardian" />{fieldErrors.relationshipType ? <div className="field-error">{fieldErrors.relationshipType}</div> : null}</div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={formSubmitting}>{formSubmitting ? 'Creating…' : 'Create care user'}</button>
              <button type="button" className="btn btn-outline" onClick={() => { resetForm(); setMode('list'); }} disabled={formSubmitting}>Cancel</button>
            </div>
          </form>
        </section>
      ) : null}

      {(mode === 'detail' || mode === 'edit') ? (
        <section className="card">
          <div className="card-header-row">
            <div>
              <h2>{mode === 'edit' ? 'Edit care user' : 'Care user details'}</h2>
              <p className="muted">Data loaded from backend for an authorized linked care user.</p>
            </div>
            <div className="row-actions">
              <button className="btn btn-outline" onClick={() => { setMode('list'); setSelectedId(null); setDetail(null); setDetailError(null); }}>Back to list</button>
              {mode === 'detail' && selectedId ? <button className="btn btn-outline" onClick={() => loadDetail(selectedId)} disabled={detailLoading}>Refresh</button> : null}
              {mode === 'detail' && detail ? <button className="btn btn-primary" onClick={openEdit}>Edit</button> : null}
            </div>
          </div>

          {detailLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading details…</div> : null}
          {detailError ? <div><div className="alert alert-error" role="alert">{detailError}</div>{selectedId ? <button className="btn btn-primary btn-sm" onClick={()=>loadDetail(selectedId)}>Retry</button> : null}</div> : null}

          {mode === 'detail' && detail ? (
            <div>
              <dl className="details">
                <div><dt>ID</dt><dd>{detail.id}</dd></div>
                <div><dt>Full name</dt><dd>{detail.fullName || '—'}</dd></div>
                <div><dt>Display name</dt><dd>{detail.displayName || '—'}</dd></div>
                <div><dt>Email</dt><dd>{detail.email || '—'}</dd></div>
                <div><dt>Phone number</dt><dd>{detail.phoneNumber || '—'}</dd></div>
                <div><dt>Preferred language</dt><dd>{detail.preferredLanguage || '—'}</dd></div>
                <div><dt>Status</dt><dd>{detail.status || '—'}</dd></div>
                <div><dt>Relationship type</dt><dd>{detail.link?.relationshipType || '—'}</dd></div>
                <div><dt>Link status</dt><dd>{detail.link?.linkStatus || '—'}</dd></div>
                <div><dt>Linked at</dt><dd>{detail.link?.linkedAt ? new Date(detail.link.linkedAt).toLocaleString() : '—'}</dd></div>
              </dl>

              <div className="section-divider" />
              <h3>Emergency contacts</h3>
              <p className="muted">View and manage real emergency contacts for this linked care user (backend/MySQL).</p>
              <div className="row-actions" style={{ marginBottom: 12 }}>
                <Link className="btn btn-outline" to={`/dashboard/emergency-contacts?careUserId=${detail.id}`}>Manage emergency contacts</Link>
              </div>

              <h3>SOS alerts</h3>
              <p className="muted">View SOS alert history and acknowledge alerts for this linked care user (backend/MySQL, no external delivery claims).</p>
              <div className="row-actions" style={{ marginBottom: 12 }}>
                <Link className="btn btn-outline" to={`/dashboard/sos-alerts?careUserId=${detail.id}`}>View SOS alerts</Link>
              </div>

              <h3>Daily routines</h3>
              <p className="muted">View and manage real daily routines, steps, and completion/progress records for this linked care user (backend/MySQL).</p>
              <div className="row-actions" style={{ marginBottom: 12 }}>
                <Link className="btn btn-outline" to={`/dashboard/routines?careUserId=${detail.id}`}>Manage routines</Link>
              </div>

              <h3>Medicines</h3>
              <p className="muted">Manage caregiver-entered medicines, stored reminder info, and view medicine history/logs for this linked care user (backend/MySQL, no delivery claims).</p>
              <div className="row-actions" style={{ marginBottom: 12 }}>
                <Link className="btn btn-outline" to={`/dashboard/medicines?careUserId=${detail.id}`}>Manage medicines</Link>
              </div>

              <h3>Communication & favourites</h3>
              <p className="muted">View global communication catalogue and this care user’s favourites (read-only for caregivers) used by the mobile TALK module (backend/MySQL).</p>
              <div className="row-actions" style={{ marginBottom: 12 }}>
                <Link className="btn btn-outline" to={`/dashboard/communication?careUserId=${detail.id}`}>View communication & favourites</Link>
              </div>

              <div className="section-divider" />
              <h3>PIN management</h3>
              <p className="muted">Set or reset the care-user PIN (caregiver-authorized). Existing PIN is never displayed. PIN is submitted only to the backend and never logged or stored in plaintext.</p>
              {!pinOpen ? (
                <button className="btn btn-outline" onClick={() => { setPinOpen(true); setPinError(null); setPinValue(''); setPinConfirm(''); }}>Set / Reset PIN</button>
              ) : (
                <form onSubmit={submitPin} className="pin-box" noValidate>
                  {pinError ? <div className="alert alert-error" role="alert">{pinError}</div> : null}
                  <div className="field"><label htmlFor="cu-pin">New PIN (4-8 digits) *</label><input id="cu-pin" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete="new-password" value={pinValue} onChange={e=>setPinValue(e.target.value.replace(/\D/g,'').slice(0,8))} disabled={pinSubmitting} /></div>
                  <div className="field"><label htmlFor="cu-pin2">Confirm PIN *</label><input id="cu-pin2" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete="new-password" value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g,'').slice(0,8))} disabled={pinSubmitting} /></div>
                  <p className="muted small">You will be asked to confirm before submission. PIN is changed only after server confirmation.</p>
                  <div className="row-actions">
                    <button type="submit" className="btn btn-primary" disabled={pinSubmitting}>{pinSubmitting ? 'Saving…' : 'Confirm & Set PIN'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => { setPinOpen(false); setPinValue(''); setPinConfirm(''); setPinError(null); }} disabled={pinSubmitting}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          ) : null}

          {mode === 'edit' && detail ? (
            <form onSubmit={submitEdit} noValidate className="form-grid">
              {formError ? <div className="alert alert-error" role="alert">{formError}</div> : null}
              <div className="field"><label htmlFor="eu-fullName">Full name *</label><input id="eu-fullName" value={fullName} onChange={e=>setFullName(e.target.value)} disabled={formSubmitting} />{fieldErrors.fullName ? <div className="field-error">{fieldErrors.fullName}</div> : null}</div>
              <div className="field"><label htmlFor="eu-displayName">Display name</label><input id="eu-displayName" value={cuDisplayName} onChange={e=>setCuDisplayName(e.target.value)} disabled={formSubmitting} />{fieldErrors.displayName ? <div className="field-error">{fieldErrors.displayName}</div> : null}</div>
              <div className="field"><label htmlFor="eu-lang">Preferred language</label><select id="eu-lang" value={preferredLanguage} onChange={e=>setPreferredLanguage(e.target.value as any)} disabled={formSubmitting}><option value="en">English (en)</option><option value="bn">Bengali (bn)</option></select></div>
              <div className="field"><label htmlFor="eu-phone">Phone number</label><input id="eu-phone" value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)} disabled={formSubmitting} />{fieldErrors.phoneNumber ? <div className="field-error">{fieldErrors.phoneNumber}</div> : null}</div>
              <div className="field"><label htmlFor="eu-status">Status</label><select id="eu-status" value={status} onChange={e=>setStatus(e.target.value as any)} disabled={formSubmitting}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              <p className="muted small" style={{gridColumn:'1 / -1'}}>Only supported fields are submitted (name, display name, preferred language, phone number, status). Role and ownership are not editable.</p>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>{formSubmitting ? 'Saving…' : 'Save changes'}</button>
                <button type="button" className="btn btn-outline" onClick={() => { setMode('detail'); setFormError(null); }} disabled={formSubmitting}>Cancel</button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
