import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, getValidationMessages } from '../services/apiClient';
import { getLinkedCareUsers } from '../services/careUserApi';
import { createEmergencyContact, deleteEmergencyContact, listEmergencyContacts, updateEmergencyContact } from '../services/emergencyContactApi';
import type { CareUser } from '../types/auth';
import type { CreateEmergencyContactPayload, EmergencyContact, UpdateEmergencyContactPayload } from '../types/emergencyContact';

function careUserLabel(u: CareUser) {
  return `${u.displayName || u.fullName || `Care user #${u.id}`} (#${u.id})`;
}

function phoneClientOk(v: string) {
  return /^[0-9+\-() ]{6,30}$/.test(v.trim());
}

export function EmergencyContactsPage() {
  const { sessionStatus } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = Number(searchParams.get('careUserId'));

  const [careUsers, setCareUsers] = useState<CareUser[] | null>(null);
  const [cuLoading, setCuLoading] = useState(true);
  const [cuError, setCuError] = useState<string | null>(null);
  const [selectedCareUserId, setSelectedCareUserId] = useState<number | ''>('');

  const [contacts, setContacts] = useState<EmergencyContact[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [contactName, setContactName] = useState('');
  const [relationshipLabel, setRelationshipLabel] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const selectedCareUser = useMemo(() => (careUsers || []).find(u => u.id === selectedCareUserId) || null, [careUsers, selectedCareUserId]);

  const resetForm = () => {
    setContactName(''); setRelationshipLabel(''); setPhoneNumber(''); setEmail(''); setIsPrimary(false);
    setFormError(null); setFieldErrors({}); setEditing(null); setShowForm(false);
  };

  const loadCareUsers = useCallback(async () => {
    if (sessionStatus === 'offline_unverified') {
      setCuLoading(false);
      setCuError('Cannot load linked care users while session verification is pending. Please retry when connected.');
      return;
    }
    setCuLoading(true); setCuError(null);
    try {
      const res = await getLinkedCareUsers();
      const list = res.data.careUsers || [];
      setCareUsers(list);
      if (list.length) {
        const wanted = Number.isFinite(requestedId) && requestedId > 0 && list.some(u => u.id === requestedId) ? requestedId : list[0].id;
        setSelectedCareUserId(prev => (prev && list.some(u => u.id === prev) ? prev : wanted));
      } else {
        setSelectedCareUserId('');
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setCuError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setCuError('You are not authorized to view care users.');
        else setCuError(e.message || 'Unable to load linked care users.');
      } else setCuError('Unable to load linked care users.');
      setCareUsers(null);
    } finally { setCuLoading(false); }
  }, [sessionStatus, requestedId]);

  const loadContacts = useCallback(async (careUserId: number) => {
    if (sessionStatus === 'offline_unverified') {
      setError('Cannot load emergency contacts while session verification is pending. Please retry when connected.');
      setContacts(null);
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await listEmergencyContacts(careUserId);
      setContacts(res.data.contacts || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setError('You are not authorized to view emergency contacts for this care user.');
        else if (e.status === 404) setError('Care user or contacts not found.');
        else setError(e.message || 'Unable to load emergency contacts.');
      } else setError('Unable to load emergency contacts.');
      setContacts(null);
    } finally { setLoading(false); }
  }, [sessionStatus]);

  useEffect(() => { loadCareUsers(); }, [loadCareUsers]);
  useEffect(() => {
    if (typeof selectedCareUserId === 'number' && selectedCareUserId > 0) {
      setInfo(null);
      resetForm();
      loadContacts(selectedCareUserId);
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('careUserId', String(selectedCareUserId)); return p; }, { replace: true });
    } else {
      setContacts(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCareUserId]);

  const openAdd = () => {
    setEditing(null); setContactName(''); setRelationshipLabel(''); setPhoneNumber(''); setEmail(''); setIsPrimary(false);
    setFormError(null); setFieldErrors({}); setShowForm(true); setInfo(null);
  };

  const openEdit = (c: EmergencyContact) => {
    setEditing(c);
    setContactName(c.contactName || '');
    setRelationshipLabel(c.relationshipLabel || '');
    setPhoneNumber(c.phoneNumber || '');
    setEmail(c.email || '');
    setIsPrimary(!!c.isPrimary);
    setFormError(null); setFieldErrors({}); setShowForm(true); setInfo(null);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const name = contactName.trim();
    if (!name) errs.contactName = 'Contact name is required.';
    else if (name.length > 150) errs.contactName = 'Contact name must be 150 characters or fewer.';
    const phone = phoneNumber.trim();
    if (!phone) errs.phoneNumber = 'Phone number is required.';
    else if (!phoneClientOk(phone)) errs.phoneNumber = 'Phone number must be valid (6-30 chars, digits/spaces/+ - ( )).';
    if (relationshipLabel && relationshipLabel.trim().length > 80) errs.relationshipLabel = 'Relationship label must be 80 characters or fewer.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Email must be valid.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting || typeof selectedCareUserId !== 'number') return;
    setFormError(null); setInfo(null);
    if (!validate()) return;
    setFormSubmitting(true);
    try {
      if (editing) {
        const payload: UpdateEmergencyContactPayload = {
          contactName: contactName.trim(),
          phoneNumber: phoneNumber.trim(),
          relationshipLabel: relationshipLabel.trim() ? relationshipLabel.trim() : null,
          email: email.trim() ? email.trim() : null,
          isPrimary,
        };
        await updateEmergencyContact(editing.id, payload);
        setInfo('Emergency contact updated successfully.');
      } else {
        const payload: CreateEmergencyContactPayload = {
          contactName: contactName.trim(),
          phoneNumber: phoneNumber.trim(),
          isPrimary,
        };
        if (relationshipLabel.trim()) payload.relationshipLabel = relationshipLabel.trim();
        if (email.trim()) payload.email = email.trim();
        await createEmergencyContact(selectedCareUserId, payload);
        setInfo('Emergency contact added successfully.');
      }
      resetForm();
      await loadContacts(selectedCareUserId);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setFormError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setFormError('You are not authorized to manage emergency contacts for this care user.');
        else if (e.status === 404) setFormError('Contact or care user not found.');
        else setFormError(getValidationMessages(e.details) || e.message || 'Unable to save emergency contact.');
      } else setFormError('Unable to save emergency contact.');
    } finally { setFormSubmitting(false); }
  };

  const onDelete = async (c: EmergencyContact) => {
    if (formSubmitting || typeof selectedCareUserId !== 'number') return;
    const ok = window.confirm(`Delete emergency contact "${c.contactName}"? This cannot be undone.`);
    if (!ok) return;
    setFormSubmitting(true); setFormError(null); setInfo(null);
    try {
      await deleteEmergencyContact(c.id);
      setInfo('Emergency contact deleted successfully.');
      if (editing?.id === c.id) resetForm();
      await loadContacts(selectedCareUserId);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setError('You are not authorized to delete this emergency contact.');
        else if (e.status === 404) setError('Emergency contact not found.');
        else setError(getValidationMessages(e.details) || e.message || 'Unable to delete emergency contact.');
      } else setError('Unable to delete emergency contact.');
    } finally { setFormSubmitting(false); }
  };

  return (
    <div className="page">
      {info ? <div className="alert alert-success" role="status">{info}</div> : null}

      <section className="card">
        <div className="card-header-row">
          <div>
            <h2>Emergency Contacts</h2>
            <p className="muted">Manage real emergency contacts for a linked care user. Data is loaded from the backend (MySQL-backed). No contacts are fabricated.</p>
          </div>
          <div className="row-actions">
            <button className="btn btn-outline" onClick={loadCareUsers} disabled={cuLoading}>Refresh care users</button>
            {typeof selectedCareUserId === 'number' ? <button className="btn btn-outline" onClick={() => loadContacts(selectedCareUserId)} disabled={loading}>Refresh contacts</button> : null}
            {typeof selectedCareUserId === 'number' ? <button className="btn btn-primary" onClick={openAdd} disabled={loading}>Add contact</button> : null}
          </div>
        </div>

        {cuLoading ? (
          <div className="inline-loading" role="status" aria-live="polite"><span className="spinner sm" aria-hidden="true" /> Loading linked care users…</div>
        ) : cuError ? (
          <div>
            <div className="alert alert-error" role="alert">{cuError}</div>
            <button className="btn btn-primary btn-sm" onClick={loadCareUsers}>Retry</button>
          </div>
        ) : !careUsers || careUsers.length === 0 ? (
          <div className="empty-state">
            <p><strong>No linked care users found.</strong></p>
            <p className="muted">Emergency contacts are scoped to a care user. Link or create a care user first (Care Users module). No data is fabricated.</p>
          </div>
        ) : (
          <div className="filters" style={{ marginTop: 8 }}>
            <label className="filter-item" style={{ maxWidth: 520 }}>
              <span>Care user</span>
              <select
                value={selectedCareUserId}
                onChange={e => setSelectedCareUserId(e.target.value ? Number(e.target.value) : '')}
                aria-label="Select care user"
              >
                <option value="" disabled>Select a care user…</option>
                {careUsers.map(u => <option key={u.id} value={u.id}>{careUserLabel(u)}</option>)}
              </select>
            </label>
            {selectedCareUser ? <div className="muted small" style={{ alignSelf: 'end' }}>Showing contacts for <strong>{careUserLabel(selectedCareUser)}</strong>. Only this care user's contacts are requested from the backend.</div> : null}
          </div>
        )}
      </section>

      {typeof selectedCareUserId === 'number' ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Contacts</h3>
          {loading ? (
            <div className="inline-loading" role="status" aria-live="polite"><span className="spinner sm" aria-hidden="true" /> Loading emergency contacts…</div>
          ) : error ? (
            <div>
              <div className="alert alert-error" role="alert">{error}</div>
              <button className="btn btn-primary btn-sm" onClick={() => loadContacts(selectedCareUserId)}>Retry</button>
            </div>
          ) : contacts && contacts.length === 0 ? (
            <div className="empty-state">
              <p><strong>No emergency contacts found.</strong></p>
              <p className="muted">The server returned an empty list for this care user. Use “Add contact” to create one (if authorized). No contacts are fabricated.</p>
            </div>
          ) : contacts ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relationship</th>
                    <th>Phone number</th>
                    <th>Email</th>
                    <th>Primary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id}>
                      <td><div className="cu-name">{c.contactName}</div><div className="muted small">ID: {c.id}</div></td>
                      <td>{c.relationshipLabel || '—'}</td>
                      <td>{c.phoneNumber || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td>{c.isPrimary ? <span className="status-badge ok">Primary</span> : <span className="muted small">No</span>}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)} disabled={formSubmitting}>Edit</button>
                          <button className="btn btn-outline btn-sm" onClick={() => onDelete(c)} disabled={formSubmitting} aria-label={`Delete ${c.contactName}`}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">Showing {contacts.length} contact(s) returned by the server for this care user.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {showForm && typeof selectedCareUserId === 'number' ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>{editing ? 'Edit emergency contact' : 'Add emergency contact'}</h3>
          <p className="muted">Only fields supported by the backend are submitted. Contact is saved only after server confirmation.</p>
          {formError ? <div className="alert alert-error" role="alert">{formError}</div> : null}
          <form onSubmit={submitForm} noValidate className="form-grid">
            <div className="field">
              <label htmlFor="ec-name">Contact name *</label>
              <input id="ec-name" value={contactName} onChange={e => setContactName(e.target.value)} disabled={formSubmitting} aria-invalid={!!fieldErrors.contactName} />
              {fieldErrors.contactName ? <div className="field-error">{fieldErrors.contactName}</div> : null}
            </div>
            <div className="field">
              <label htmlFor="ec-rel">Relationship</label>
              <input id="ec-rel" value={relationshipLabel} onChange={e => setRelationshipLabel(e.target.value)} disabled={formSubmitting} placeholder="e.g. Parent, Sibling" />
              {fieldErrors.relationshipLabel ? <div className="field-error">{fieldErrors.relationshipLabel}</div> : null}
            </div>
            <div className="field">
              <label htmlFor="ec-phone">Phone number *</label>
              <input id="ec-phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} disabled={formSubmitting} aria-invalid={!!fieldErrors.phoneNumber} placeholder="e.g. +8801700000000" />
              {fieldErrors.phoneNumber ? <div className="field-error">{fieldErrors.phoneNumber}</div> : <div className="muted small">6–30 characters: digits, spaces, +, -, (, )</div>}
            </div>
            <div className="field">
              <label htmlFor="ec-email">Email</label>
              <input id="ec-email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={formSubmitting} aria-invalid={!!fieldErrors.email} />
              {fieldErrors.email ? <div className="field-error">{fieldErrors.email}</div> : null}
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
                <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} disabled={formSubmitting} />
                Set as primary contact
              </label>
              <div className="muted small">Primary status is managed by the backend (setting primary clears others; backend ensures consistency).</div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={formSubmitting}>{formSubmitting ? 'Saving…' : (editing ? 'Save changes' : 'Add contact')}</button>
              <button type="button" className="btn btn-outline" onClick={resetForm} disabled={formSubmitting}>Cancel</button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
