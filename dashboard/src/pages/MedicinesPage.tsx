import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, getValidationMessages } from '../services/apiClient';
import { getLinkedCareUsers } from '../services/careUserApi';
import {
  createMedicine, createMedicineReminder, deleteOrDeactivateMedicine, deleteOrDeactivateReminder,
  getMedicine, getMedicineHistory, getMedicineLogs, listMedicines, listMedicineReminders,
  updateMedicine, updateMedicineReminder,
} from '../services/medicineApi';
import type { CareUser } from '../types/auth';
import type { CreateMedicinePayload, CreateReminderPayload, Medicine, MedicineLog, MedicineReminder, UpdateMedicinePayload, UpdateReminderPayload } from '../types/medicine';

function careUserLabel(u: CareUser) { return `${u.displayName || u.fullName || `Care user #${u.id}`} (#${u.id})`; }
function fmt(dt?: string | null) { if (!dt) return '—'; const d = new Date(dt); return Number.isNaN(d.getTime()) ? String(dt) : d.toLocaleString(); }
function dateOnly(v?: string | null) { if (!v) return '—'; return String(v).slice(0, 10); }

export function MedicinesPage() {
  const { sessionStatus } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = Number(searchParams.get('careUserId'));

  const [careUsers, setCareUsers] = useState<CareUser[] | null>(null);
  const [cuLoading, setCuLoading] = useState(true);
  const [cuError, setCuError] = useState<string | null>(null);
  const [selectedCareUserId, setSelectedCareUserId] = useState<number | ''>('');

  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [history, setHistory] = useState<MedicineLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // detail/manage
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);
  const [detailMed, setDetailMed] = useState<Medicine | null>(null);
  const [detailRems, setDetailRems] = useState<MedicineReminder[]>([]);
  const [detailLogs, setDetailLogs] = useState<MedicineLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editMedMode, setEditMedMode] = useState(false);
  const [remFormMode, setRemFormMode] = useState<null | 'add' | number>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);

  // medicine form
  const [medName, setMedName] = useState('');
  const [presc, setPresc] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [medActive, setMedActive] = useState(true);

  // reminder form
  const [remTime, setRemTime] = useState('08:00');
  const [remFreq, setRemFreq] = useState<'once' | 'daily' | 'weekly' | 'custom'>('daily');
  const [remDays, setRemDays] = useState('');
  const [remLabel, setRemLabel] = useState('');
  const [remActive, setRemActive] = useState(true);
  const [remError, setRemError] = useState<string | null>(null);

  const selectedCareUser = useMemo(() => (careUsers || []).find(u => u.id === selectedCareUserId) || null, [careUsers, selectedCareUserId]);
  const resetMedForm = () => { setMedName(''); setPresc(''); setNotes(''); setStartDate(''); setEndDate(''); setMedActive(true); setFormError(null); setFieldErrors({}); };
  const resetRemForm = () => { setRemFormMode(null); setRemTime('08:00'); setRemFreq('daily'); setRemDays(''); setRemLabel(''); setRemActive(true); setRemError(null); };

  const loadCareUsers = useCallback(async () => {
    if (sessionStatus === 'offline_unverified') { setCuLoading(false); setCuError('Cannot load linked care users while session verification is pending. Please retry when connected.'); return; }
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
      if (e instanceof ApiError) {
        if (e.status === 401) setCuError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setCuError('You are not authorized to view care users.');
        else setCuError(e.message || 'Unable to load linked care users.');
      } else setCuError('Unable to load linked care users.');
      setCareUsers(null);
    } finally { setCuLoading(false); }
  }, [sessionStatus, requestedId]);

  const loadMeds = useCallback(async (careUserId: number) => {
    if (sessionStatus === 'offline_unverified') { setError('Cannot load medicines while session verification is pending. Please retry when connected.'); setMedicines(null); return; }
    setLoading(true); setError(null);
    try {
      const [mRes, hRes] = await Promise.all([
        listMedicines(careUserId),
        getMedicineHistory(careUserId).catch(() => null),
      ]);
      setMedicines(mRes.data.medicines || []);
      setHistory(hRes?.data?.history || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setError('You are not authorized to view medicines for this care user.');
        else if (e.status === 404) setError('Care user or medicines not found.');
        else setError(e.message || 'Unable to load medicines.');
      } else setError('Unable to load medicines.');
      setMedicines(null); setHistory(null);
    } finally { setLoading(false); setHistoryLoading(false); }
  }, [sessionStatus]);

  const loadDetail = useCallback(async (medicineId: number) => {
    setDetailLoading(true); setDetailError(null);
    try {
      const [mRes, rRes, lRes] = await Promise.all([
        getMedicine(medicineId),
        listMedicineReminders(medicineId).catch(() => ({ data: { reminders: [] } })),
        getMedicineLogs(medicineId).catch(() => ({ data: { logs: [] } })),
      ]);
      setDetailMed(mRes.data.medicine);
      setDetailRems(rRes.data.reminders || []);
      setDetailLogs(lRes.data.logs || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setDetailError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setDetailError('You are not authorized to view this medicine.');
        else if (e.status === 404) setDetailError('Medicine not found.');
        else setDetailError(e.message || 'Unable to load medicine details.');
      } else setDetailError('Unable to load medicine details.');
      setDetailMed(null); setDetailRems([]); setDetailLogs([]);
    } finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { loadCareUsers(); }, [loadCareUsers]);
  useEffect(() => {
    if (typeof selectedCareUserId === 'number' && selectedCareUserId > 0) {
      setInfo(null); setShowCreate(false); setSelectedMedicineId(null); setDetailMed(null); setDetailError(null);
      loadMeds(selectedCareUserId);
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('careUserId', String(selectedCareUserId)); return p; }, { replace: true });
    } else { setMedicines(null); setHistory(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCareUserId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (medicines || []).filter(m => {
      if (activeFilter === 'active' && !m.isActive) return false;
      if (activeFilter === 'inactive' && m.isActive) return false;
      if (!q) return true;
      return `${m.id} ${m.medicineName || ''} ${m.prescribedInstructions || ''} ${m.notes || ''}`.toLowerCase().includes(q);
    });
  }, [medicines, search, activeFilter]);

  const openDetail = async (id: number) => { setSelectedMedicineId(id); setEditMedMode(false); resetRemForm(); setInfo(null); await loadDetail(id); };
  const closeDetail = () => { setSelectedMedicineId(null); setDetailMed(null); setDetailRems([]); setDetailLogs([]); setDetailError(null); setEditMedMode(false); resetRemForm(); };

  const validateMed = () => {
    const errs: Record<string, string> = {};
    if (!medName.trim()) errs.medicineName = 'Medicine name is required.';
    else if (medName.trim().length > 150) errs.medicineName = 'Medicine name must be 150 characters or fewer.';
    if (startDate && endDate && endDate < startDate) errs.endDate = 'End date must be on or after start date.';
    setFieldErrors(errs); return Object.keys(errs).length === 0;
  };

  const submitCreateMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting || typeof selectedCareUserId !== 'number') return;
    setFormError(null); setInfo(null);
    if (!validateMed()) return;
    const payload: CreateMedicinePayload = { medicineName: medName.trim(), isActive: medActive };
    if (presc.trim()) payload.prescribedInstructions = presc.trim();
    if (notes.trim()) payload.notes = notes.trim();
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    setFormSubmitting(true);
    try {
      await createMedicine(selectedCareUserId, payload);
      setInfo('Medicine created successfully (caregiver-entered information only).');
      setShowCreate(false); resetMedForm();
      await loadMeds(selectedCareUserId);
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to create medicine.');
      else setFormError('Unable to create medicine.');
    } finally { setFormSubmitting(false); }
  };

  const startEditMed = () => {
    if (!detailMed) return;
    setMedName(detailMed.medicineName || ''); setPresc(detailMed.prescribedInstructions || ''); setNotes(detailMed.notes || '');
    setStartDate(detailMed.startDate ? String(detailMed.startDate).slice(0,10) : ''); setEndDate(detailMed.endDate ? String(detailMed.endDate).slice(0,10) : '');
    setMedActive(!!detailMed.isActive); setFormError(null); setFieldErrors({}); setEditMedMode(true); setInfo(null);
  };

  const submitEditMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting || !detailMed) return;
    setFormError(null); setInfo(null);
    if (!validateMed()) return;
    const payload: UpdateMedicinePayload = {
      medicineName: medName.trim(),
      prescribedInstructions: presc.trim() ? presc.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      startDate: startDate || null,
      endDate: endDate || null,
      isActive: medActive,
    };
    setFormSubmitting(true);
    try {
      await updateMedicine(detailMed.id, payload);
      setInfo('Medicine updated successfully.');
      setEditMedMode(false);
      await Promise.all([loadDetail(detailMed.id), typeof selectedCareUserId === 'number' ? loadMeds(selectedCareUserId) : Promise.resolve()]);
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to update medicine.');
      else setFormError('Unable to update medicine.');
    } finally { setFormSubmitting(false); }
  };

  const onDeactivateOrDeleteMed = async (hard: boolean) => {
    if (!detailMed || formSubmitting) return;
    const msg = hard
      ? 'Permanently delete this medicine and its reminders/logs (cascades per backend schema)? This cannot be undone.'
      : 'Deactivate this medicine (default behavior)? It will be marked inactive; records/reminders/logs behavior follows backend rules.';
    if (!window.confirm(msg)) return;
    setFormSubmitting(true); setFormError(null); setInfo(null);
    try {
      await deleteOrDeactivateMedicine(detailMed.id, hard);
      setInfo(hard ? 'Medicine deleted successfully.' : 'Medicine deactivated successfully.');
      closeDetail();
      if (typeof selectedCareUserId === 'number') await loadMeds(selectedCareUserId);
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to remove/deactivate medicine.');
      else setFormError('Unable to remove/deactivate medicine.');
    } finally { setFormSubmitting(false); }
  };

  const startAddRem = () => { resetRemForm(); setRemFormMode('add'); };
  const startEditRem = (r: MedicineReminder) => { setRemFormMode(r.id); setRemTime(String(r.reminderTime).slice(0,5)); setRemFreq((r.frequency as any)||'daily'); setRemDays(r.daysOfWeek||''); setRemLabel(r.reminderLabel||''); setRemActive(!!r.isActive); setRemError(null); };

  const submitRem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailMed || formSubmitting || remFormMode == null) return;
    setRemError(null); setInfo(null);
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(remTime)) { setRemError('Reminder time must be HH:MM.'); return; }
    setFormSubmitting(true);
    try {
      const payload: CreateReminderPayload = { reminderTime: remTime, frequency: remFreq, daysOfWeek: remDays.trim() || null, reminderLabel: remLabel.trim() || null, isActive: remActive };
      if (remFormMode === 'add') {
        await createMedicineReminder(detailMed.id, payload as any);
        setInfo('Reminder created successfully (stored reminder info only; no delivery claimed).');
      } else {
        await updateMedicineReminder(detailMed.id, remFormMode, payload as UpdateReminderPayload);
        setInfo('Reminder updated successfully.');
      }
      resetRemForm();
      await loadDetail(detailMed.id);
    } catch (e) {
      if (e instanceof ApiError) setRemError(getValidationMessages(e.details) || e.message || 'Unable to save reminder.');
      else setRemError('Unable to save reminder.');
    } finally { setFormSubmitting(false); }
  };

  const onDeleteRem = async (remId: number, deactivateOnly: boolean) => {
    if (!detailMed || formSubmitting) return;
    const msg = deactivateOnly ? 'Deactivate this reminder?' : 'Delete this reminder?';
    if (!window.confirm(msg)) return;
    setFormSubmitting(true); setRemError(null); setInfo(null);
    try {
      await deleteOrDeactivateReminder(detailMed.id, remId, deactivateOnly);
      setInfo(deactivateOnly ? 'Reminder deactivated successfully.' : 'Reminder deleted successfully.');
      if (remFormMode === remId) resetRemForm();
      await loadDetail(detailMed.id);
    } catch (e) {
      if (e instanceof ApiError) setRemError(getValidationMessages(e.details) || e.message || 'Unable to update/remove reminder.');
      else setRemError('Unable to update/remove reminder.');
    } finally { setFormSubmitting(false); }
  };

  return (
    <div className="page">
      {info ? <div className="alert alert-success" role="status">{info}</div> : null}

      <section className="card">
        <div className="card-header-row">
          <div>
            <h2>Medicines</h2>
            <p className="muted">Manage caregiver-entered medicine information for a linked care user (backend/MySQL). Reminders are stored/configured info only — <strong>no external notification/SMS/email delivery is claimed or implemented</strong>. History/logs are read-only genuine records.</p>
          </div>
          <div className="row-actions">
            <button className="btn btn-outline" onClick={loadCareUsers} disabled={cuLoading}>Refresh care users</button>
            {typeof selectedCareUserId === 'number' ? <button className="btn btn-outline" onClick={() => loadMeds(selectedCareUserId)} disabled={loading}>Refresh medicines</button> : null}
            {typeof selectedCareUserId === 'number' ? <button className="btn btn-primary" onClick={() => { resetMedForm(); setShowCreate(v=>!v); setInfo(null); }}>{showCreate ? 'Close form' : 'Add medicine'}</button> : null}
          </div>
        </div>

        {cuLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading linked care users…</div>
        : cuError ? <div><div className="alert alert-error" role="alert">{cuError}</div><button className="btn btn-primary btn-sm" onClick={loadCareUsers}>Retry</button></div>
        : !careUsers || careUsers.length === 0 ? <div className="empty-state"><p><strong>No linked care users found.</strong></p><p className="muted">Medicines are scoped to a linked care user. No data is fabricated.</p></div>
        : (
          <div className="filters" style={{ marginTop: 8 }}>
            <label className="filter-item" style={{ maxWidth: 520 }}><span>Care user</span>
              <select value={selectedCareUserId} onChange={e => setSelectedCareUserId(e.target.value ? Number(e.target.value) : '')} aria-label="Select care user">
                <option value="" disabled>Select a care user…</option>
                {careUsers.map(u => <option key={u.id} value={u.id}>{careUserLabel(u)}</option>)}
              </select>
            </label>
            <label className="filter-item"><span>Search (fetched)</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, instructions, notes, ID…" /></label>
            <label className="filter-item"><span>Status</span><select value={activeFilter} onChange={e=>setActiveFilter(e.target.value as any)}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            {selectedCareUser ? <div className="muted small" style={{ alignSelf:'end' }}>Showing medicines for <strong>{careUserLabel(selectedCareUser)}</strong>. No medical advice is provided.</div> : null}
          </div>
        )}
      </section>

      {showCreate && typeof selectedCareUserId === 'number' ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Add medicine</h3>
          <p className="muted">Caregiver-entered information only. Do not add medical advice or dosage recommendations.</p>
          {formError ? <div className="alert alert-error" role="alert">{formError}</div> : null}
          <form onSubmit={submitCreateMed} noValidate className="form-grid">
            <div className="field"><label htmlFor="m-name">Medicine name *</label><input id="m-name" value={medName} onChange={e=>setMedName(e.target.value)} disabled={formSubmitting} />{fieldErrors.medicineName ? <div className="field-error">{fieldErrors.medicineName}</div> : null}</div>
            <div className="field"><label htmlFor="m-start">Start date</label><input id="m-start" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} disabled={formSubmitting} /></div>
            <div className="field"><label htmlFor="m-end">End date</label><input id="m-end" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} disabled={formSubmitting} />{fieldErrors.endDate ? <div className="field-error">{fieldErrors.endDate}</div> : null}</div>
            <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="m-presc">Prescribed instructions (caregiver-entered)</label><textarea id="m-presc" value={presc} onChange={e=>setPresc(e.target.value)} disabled={formSubmitting} rows={2} /></div>
            <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="m-notes">Notes</label><textarea id="m-notes" value={notes} onChange={e=>setNotes(e.target.value)} disabled={formSubmitting} rows={2} /></div>
            <div className="field"><label style={{ display:'flex', gap:8, alignItems:'center', fontWeight:600 }}><input type="checkbox" checked={medActive} onChange={e=>setMedActive(e.target.checked)} disabled={formSubmitting} /> Active</label></div>
            <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={formSubmitting}>{formSubmitting ? 'Creating…' : 'Add medicine'}</button><button type="button" className="btn btn-outline" onClick={()=>{ setShowCreate(false); resetMedForm(); }} disabled={formSubmitting}>Cancel</button></div>
          </form>
        </section>
      ) : null}

      {typeof selectedCareUserId === 'number' ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Medicines</h3>
          {loading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading medicines…</div>
          : error ? <div><div className="alert alert-error" role="alert">{error}</div><button className="btn btn-primary btn-sm" onClick={()=>loadMeds(selectedCareUserId)}>Retry</button></div>
          : medicines && medicines.length === 0 ? <div className="empty-state"><p><strong>No medicines found.</strong></p><p className="muted">The server returned an empty list for this care user. No medicines are fabricated.</p></div>
          : filtered.length === 0 ? <div className="empty-state"><p>No medicines match the current search/filter (applied over fetched data).</p></div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Medicine</th><th>Status</th><th>Dates</th><th>Instructions/Notes</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id}>
                      <td><div className="cu-name">{m.medicineName}</div><div className="muted small">ID: {m.id}</div></td>
                      <td><span className={`status-badge ${m.isActive ? 'ok' : 'muted-b'}`}>{m.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td><div className="muted small">{dateOnly(m.startDate)} → {dateOnly(m.endDate)}</div></td>
                      <td><div className="muted small">{m.prescribedInstructions ? m.prescribedInstructions.slice(0, 80) + (m.prescribedInstructions.length>80?'…':'') : '—'}{m.notes ? ` · ${m.notes.slice(0,60)}${m.notes.length>60?'…':''}` : ''}</div></td>
                      <td><button className="btn btn-outline btn-sm" onClick={()=>openDetail(m.id)}>Manage</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">Showing {filtered.length} of {medicines?.length || 0} fetched medicine(s). No dosage advice provided.</p>
            </div>
          )}
        </section>
      ) : null}

      {selectedMedicineId ? (
        <section className="card">
          <div className="card-header-row">
            <div><h3 style={{ margin: 0 }}>Medicine details, reminders & history</h3><p className="muted">Caregiver-entered info only. Reminders are stored/configured info — no delivery confirmed. Logs/history are read-only genuine records.</p></div>
            <div className="row-actions"><button className="btn btn-outline" onClick={closeDetail}>Close</button><button className="btn btn-outline" onClick={()=>loadDetail(selectedMedicineId)} disabled={detailLoading}>Refresh</button>{detailMed ? <button className="btn btn-primary" onClick={startEditMed} disabled={formSubmitting}>Edit medicine</button> : null}</div>
          </div>

          {detailLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading details…</div> : null}
          {detailError ? <div className="alert alert-error" role="alert">{detailError}</div> : null}
          {formError && detailMed ? <div className="alert alert-error" role="alert">{formError}</div> : null}

          {detailMed && !editMedMode ? (
            <div>
              <dl className="details">
                <div><dt>ID</dt><dd>{detailMed.id}</dd></div>
                <div><dt>Name</dt><dd>{detailMed.medicineName}</dd></div>
                <div><dt>Status</dt><dd><span className={`status-badge ${detailMed.isActive ? 'ok' : 'muted-b'}`}>{detailMed.isActive ? 'Active' : 'Inactive'}</span></dd></div>
                <div><dt>Start / End</dt><dd>{dateOnly(detailMed.startDate)} / {dateOnly(detailMed.endDate)}</dd></div>
                <div><dt>Prescribed instructions</dt><dd>{detailMed.prescribedInstructions || '—'}</dd></div>
                <div><dt>Notes</dt><dd>{detailMed.notes || '—'}</dd></div>
              </dl>
              <div className="row-actions" style={{ margin:'8px 0 12px' }}>
                <button className="btn btn-outline" onClick={()=>onDeactivateOrDeleteMed(false)} disabled={formSubmitting}>{detailMed.isActive ? 'Deactivate medicine' : 'Deactivate (already inactive)'}</button>
                <button className="btn btn-outline" onClick={()=>onDeactivateOrDeleteMed(true)} disabled={formSubmitting}>Delete medicine (hard)</button>
              </div>

              <div className="section-divider" />
              <div className="card-header-row"><h4 style={{ margin:0 }}>Reminders (stored/configured info only — no delivery claimed)</h4><button className="btn btn-outline btn-sm" onClick={startAddRem} disabled={formSubmitting}>Add reminder</button></div>
              {remError ? <div className="alert alert-error" role="alert">{remError}</div> : null}
              {detailRems.length === 0 ? <div className="empty-state"><p><strong>No reminders configured.</strong></p><p className="muted">Server returned no reminder records.</p></div> : (
                <div className="table-wrap"><table className="data-table"><thead><tr><th>Time</th><th>Freq/Days</th><th>Label</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                  {detailRems.map(r => (<tr key={r.id}><td>{r.reminderTime}</td><td><div>{r.frequency}</div>{r.daysOfWeek ? <div className="muted small">{r.daysOfWeek}</div> : null}</td><td>{r.reminderLabel || '—'}</td><td><span className={`status-badge ${r.isActive ? 'ok' : 'muted-b'}`}>{r.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td><div className="row-actions"><button className="btn btn-outline btn-sm" onClick={()=>startEditRem(r)} disabled={formSubmitting}>Edit</button><button className="btn btn-outline btn-sm" onClick={()=>onDeleteRem(r.id, true)} disabled={formSubmitting}>Delete</button><button className="btn btn-outline btn-sm" onClick={()=>onDeleteRem(r.id, false)} disabled={formSubmitting}>{r.isActive ? 'Deactivate' : 'Deactivate'}</button></div></td></tr>))}
                </tbody></table></div>
              )}

              {remFormMode != null ? (
                <form onSubmit={submitRem} className="form-grid" style={{ marginTop: 12 }} noValidate>
                  <h4 style={{ gridColumn:'1 / -1', margin:0 }}>{remFormMode === 'add' ? 'Add reminder' : `Edit reminder #${remFormMode}`}</h4>
                  <div className="field"><label htmlFor="rem-time">Reminder time (HH:MM) *</label><input id="rem-time" value={remTime} onChange={e=>setRemTime(e.target.value)} placeholder="08:00" disabled={formSubmitting} /></div>
                  <div className="field"><label htmlFor="rem-freq">Frequency</label><select id="rem-freq" value={remFreq} onChange={e=>setRemFreq(e.target.value as any)} disabled={formSubmitting}><option value="once">once</option><option value="daily">daily</option><option value="weekly">weekly</option><option value="custom">custom</option></select></div>
                  <div className="field"><label htmlFor="rem-days">Days of week (e.g. MON,TUE)</label><input id="rem-days" value={remDays} onChange={e=>setRemDays(e.target.value)} disabled={formSubmitting} /></div>
                  <div className="field"><label htmlFor="rem-label">Label</label><input id="rem-label" value={remLabel} onChange={e=>setRemLabel(e.target.value)} disabled={formSubmitting} /></div>
                  <div className="field"><label style={{ display:'flex', gap:8, alignItems:'center', fontWeight:600 }}><input type="checkbox" checked={remActive} onChange={e=>setRemActive(e.target.checked)} disabled={formSubmitting} /> Active</label></div>
                  <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={formSubmitting}>{formSubmitting ? 'Saving…' : 'Save reminder'}</button><button type="button" className="btn btn-outline" onClick={resetRemForm} disabled={formSubmitting}>Cancel</button></div>
                </form>
              ) : null}

              <div className="section-divider" />
              <h4 style={{ marginTop: 0 }}>Medicine logs/history (read-only, genuine records)</h4>
              <p className="muted small">Logs show scheduled/responded times and statuses (taken/skipped/missed/pending) from the backend. Dashboard does not mark medicines taken/modify logs.</p>
              {detailLogs.length === 0 ? <div className="empty-state"><p><strong>No logs found.</strong></p><p className="muted">No medicine log records returned for this medicine.</p></div> : (
                <div className="table-wrap"><table className="data-table"><thead><tr><th>ID</th><th>Status</th><th>Scheduled for</th><th>Responded at</th><th>Reminder ID</th><th>Notes</th></tr></thead><tbody>
                  {detailLogs.map(l => (<tr key={l.id}><td>{l.id}</td><td>{l.status}</td><td>{fmt(l.scheduledFor)}</td><td>{fmt(l.respondedAt)}</td><td>{l.reminderId ?? '—'}</td><td>{l.notes || '—'}</td></tr>))}
                </tbody></table></div>
              )}
            </div>
          ) : null}

          {detailMed && editMedMode ? (
            <form onSubmit={submitEditMed} noValidate className="form-grid">
              {formError ? <div className="alert alert-error" role="alert">{formError}</div> : null}
              <div className="field"><label htmlFor="em-name">Medicine name *</label><input id="em-name" value={medName} onChange={e=>setMedName(e.target.value)} disabled={formSubmitting} />{fieldErrors.medicineName ? <div className="field-error">{fieldErrors.medicineName}</div> : null}</div>
              <div className="field"><label htmlFor="em-start">Start date</label><input id="em-start" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} disabled={formSubmitting} /></div>
              <div className="field"><label htmlFor="em-end">End date</label><input id="em-end" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} disabled={formSubmitting} />{fieldErrors.endDate ? <div className="field-error">{fieldErrors.endDate}</div> : null}</div>
              <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="em-presc">Prescribed instructions (caregiver-entered)</label><textarea id="em-presc" value={presc} onChange={e=>setPresc(e.target.value)} disabled={formSubmitting} rows={2} /></div>
              <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="em-notes">Notes</label><textarea id="em-notes" value={notes} onChange={e=>setNotes(e.target.value)} disabled={formSubmitting} rows={2} /></div>
              <div className="field"><label style={{ display:'flex', gap:8, alignItems:'center', fontWeight:600 }}><input type="checkbox" checked={medActive} onChange={e=>setMedActive(e.target.checked)} disabled={formSubmitting} /> Active</label></div>
              <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={formSubmitting}>{formSubmitting ? 'Saving…' : 'Save changes'}</button><button type="button" className="btn btn-outline" onClick={()=>{ setEditMedMode(false); setFormError(null); }} disabled={formSubmitting}>Cancel</button></div>
            </form>
          ) : null}
        </section>
      ) : null}

      {typeof selectedCareUserId === 'number' && history ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Medicine history (all medicines, care user)</h3>
          <p className="muted small">Genuine logs joined with medicine names from backend; read-only.</p>
          {history.length === 0 ? <div className="empty-state"><p><strong>No history records found.</strong></p></div> : (
            <div className="table-wrap"><table className="data-table"><thead><tr><th>Medicine</th><th>Status</th><th>Scheduled</th><th>Responded</th><th>Reminder</th><th>Notes</th></tr></thead><tbody>
              {history.map(h => (<tr key={h.id}><td>{h.medicineName || `#${h.medicineId}`}</td><td>{h.status}</td><td>{fmt(h.scheduledFor)}</td><td>{fmt(h.respondedAt)}</td><td>{h.reminderId ?? '—'}</td><td>{h.notes || '—'}</td></tr>))}
            </tbody></table></div>
          )}
        </section>
      ) : null}
    </div>
  );
}
