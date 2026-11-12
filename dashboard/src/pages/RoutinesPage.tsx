import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, getValidationMessages } from '../services/apiClient';
import { getLinkedCareUsers } from '../services/careUserApi';
import {
  addRoutineStep, createRoutine, deleteRoutine, deleteRoutineStep, getRoutine, getRoutineCompletions,
  getRoutineProgress, listRoutines, reorderRoutineSteps, updateRoutine, updateRoutineStep,
} from '../services/routineApi';
import type { CareUser } from '../types/auth';
import type { CreateRoutinePayload, Routine, RoutineCompletion, RoutineProgressItem, RoutineStep, UpdateRoutinePayload } from '../types/routine';

function careUserLabel(u: CareUser) { return `${u.displayName || u.fullName || `Care user #${u.id}`} (#${u.id})`; }
function fmt(dt?: string | null) { if (!dt) return '—'; const d = new Date(dt); return Number.isNaN(d.getTime()) ? String(dt) : d.toLocaleString(); }
function todayIso() { return new Date().toISOString().slice(0, 10); }

export function RoutinesPage() {
  const { sessionStatus } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = Number(searchParams.get('careUserId'));

  const [careUsers, setCareUsers] = useState<CareUser[] | null>(null);
  const [cuLoading, setCuLoading] = useState(true);
  const [cuError, setCuError] = useState<string | null>(null);
  const [selectedCareUserId, setSelectedCareUserId] = useState<number | ''>('');

  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [progress, setProgress] = useState<RoutineProgressItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // routine detail/manage
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ routine: Routine; steps: RoutineStep[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [completions, setCompletions] = useState<RoutineCompletion[] | null>(null);
  const [completionDate, setCompletionDate] = useState(todayIso());
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // forms
  const [showCreate, setShowCreate] = useState(false);
  const [editRoutineMode, setEditRoutineMode] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [titleEn, setTitleEn] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descBn, setDescBn] = useState('');
  const [iconKey, setIconKey] = useState('');
  const [isActive, setIsActive] = useState(true);

  // step forms
  const [stepFormMode, setStepFormMode] = useState<null | 'add' | number>(null); // number = stepId edit
  const [stepInstructionEn, setStepInstructionEn] = useState('');
  const [stepInstructionBn, setStepInstructionBn] = useState('');
  const [stepImageKey, setStepImageKey] = useState('');
  const [stepAudioHintKey, setStepAudioHintKey] = useState('');
  const [stepSubmitting, setStepSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const selectedCareUser = useMemo(() => (careUsers || []).find(u => u.id === selectedCareUserId) || null, [careUsers, selectedCareUserId]);

  const resetRoutineForm = () => { setTitleEn(''); setTitleBn(''); setDescEn(''); setDescBn(''); setIconKey(''); setIsActive(true); setFormError(null); setFieldErrors({}); };
  const resetStepForm = () => { setStepFormMode(null); setStepInstructionEn(''); setStepInstructionBn(''); setStepImageKey(''); setStepAudioHintKey(''); setStepError(null); };

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

  const loadRoutines = useCallback(async (careUserId: number) => {
    if (sessionStatus === 'offline_unverified') { setError('Cannot load routines while session verification is pending. Please retry when connected.'); setRoutines(null); return; }
    setLoading(true); setError(null);
    try {
      const [rRes, pRes] = await Promise.all([
        listRoutines(careUserId),
        getRoutineProgress(careUserId, todayIso()).catch(() => null),
      ]);
      setRoutines(rRes.data.routines || []);
      setProgress(pRes?.data?.progress || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setError('You are not authorized to view routines for this care user.');
        else if (e.status === 404) setError('Care user or routines not found.');
        else setError(e.message || 'Unable to load routines.');
      } else setError('Unable to load routines.');
      setRoutines(null); setProgress([]);
    } finally { setLoading(false); }
  }, [sessionStatus]);

  const loadDetail = useCallback(async (routineId: number) => {
    setDetailLoading(true); setDetailError(null);
    try {
      const res = await getRoutine(routineId);
      setDetail({ routine: res.data.routine, steps: res.data.steps || [] });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setDetailError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setDetailError('You are not authorized to view this routine.');
        else if (e.status === 404) setDetailError('Routine not found.');
        else setDetailError(e.message || 'Unable to load routine details.');
      } else setDetailError('Unable to load routine details.');
      setDetail(null);
    } finally { setDetailLoading(false); }
  }, []);

  const loadCompletions = useCallback(async (routineId: number, date: string) => {
    setCompletionLoading(true); setCompletionError(null);
    try {
      const res = await getRoutineCompletions(routineId, date ? { date } : undefined);
      setCompletions(res.data.completions || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setCompletionError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setCompletionError('You are not authorized to view completions for this routine.');
        else if (e.status === 404) setCompletionError('Routine not found.');
        else setCompletionError(e.message || 'Unable to load completion records.');
      } else setCompletionError('Unable to load completion records.');
      setCompletions(null);
    } finally { setCompletionLoading(false); }
  }, []);

  useEffect(() => { loadCareUsers(); }, [loadCareUsers]);
  useEffect(() => {
    if (typeof selectedCareUserId === 'number' && selectedCareUserId > 0) {
      setInfo(null); setShowCreate(false); setSelectedRoutineId(null); setDetail(null); setCompletions(null);
      loadRoutines(selectedCareUserId);
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('careUserId', String(selectedCareUserId)); return p; }, { replace: true });
    } else { setRoutines(null); setProgress([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCareUserId]);

  const progressByRoutine = useMemo(() => { const m = new Map<number, RoutineProgressItem>(); for (const p of progress) m.set(p.routineId, p); return m; }, [progress]);
  const filteredRoutines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (routines || []).filter(r => {
      if (activeFilter === 'active' && !r.isActive) return false;
      if (activeFilter === 'inactive' && r.isActive) return false;
      if (!q) return true;
      return `${r.id} ${r.titleEn || ''} ${r.titleBn || ''} ${r.descriptionEn || ''}`.toLowerCase().includes(q);
    });
  }, [routines, search, activeFilter]);

  const openDetail = async (id: number) => { setSelectedRoutineId(id); setEditRoutineMode(false); resetStepForm(); setInfo(null); await loadDetail(id); loadCompletions(id, completionDate); };
  const closeDetail = () => { setSelectedRoutineId(null); setDetail(null); setDetailError(null); setCompletions(null); setCompletionError(null); setEditRoutineMode(false); resetStepForm(); };

  const validateRoutine = () => {
    const errs: Record<string, string> = {};
    if (!titleEn.trim()) errs.titleEn = 'Title (English) is required.';
    else if (titleEn.trim().length > 150) errs.titleEn = 'Title must be 150 characters or fewer.';
    if (titleBn.trim().length > 150) errs.titleBn = 'Bengali title must be 150 characters or fewer.';
    if (iconKey.trim().length > 80) errs.iconKey = 'Icon key must be 80 characters or fewer.';
    setFieldErrors(errs); return Object.keys(errs).length === 0;
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting || typeof selectedCareUserId !== 'number') return;
    setFormError(null); setInfo(null);
    if (!validateRoutine()) return;
    const payload: CreateRoutinePayload = { titleEn: titleEn.trim(), isActive };
    if (titleBn.trim()) payload.titleBn = titleBn.trim();
    if (descEn.trim()) payload.descriptionEn = descEn.trim();
    if (descBn.trim()) payload.descriptionBn = descBn.trim();
    if (iconKey.trim()) payload.iconKey = iconKey.trim();
    setFormSubmitting(true);
    try {
      await createRoutine(selectedCareUserId, payload);
      setInfo('Routine created successfully.');
      setShowCreate(false); resetRoutineForm();
      await loadRoutines(selectedCareUserId);
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to create routine.');
      else setFormError('Unable to create routine.');
    } finally { setFormSubmitting(false); }
  };

  const startEditRoutine = () => {
    if (!detail) return;
    setTitleEn(detail.routine.titleEn || ''); setTitleBn(detail.routine.titleBn || ''); setDescEn(detail.routine.descriptionEn || ''); setDescBn(detail.routine.descriptionBn || ''); setIconKey(detail.routine.iconKey || ''); setIsActive(!!detail.routine.isActive);
    setFormError(null); setFieldErrors({}); setEditRoutineMode(true); setInfo(null);
  };

  const submitEditRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting || !detail) return;
    setFormError(null); setInfo(null);
    if (!validateRoutine()) return;
    const payload: UpdateRoutinePayload = {
      titleEn: titleEn.trim(),
      titleBn: titleBn.trim() ? titleBn.trim() : null,
      descriptionEn: descEn.trim() ? descEn.trim() : null,
      descriptionBn: descBn.trim() ? descBn.trim() : null,
      iconKey: iconKey.trim() ? iconKey.trim() : null,
      isActive,
    };
    setFormSubmitting(true);
    try {
      await updateRoutine(detail.routine.id, payload);
      setInfo('Routine updated successfully.');
      setEditRoutineMode(false);
      await Promise.all([loadDetail(detail.routine.id), typeof selectedCareUserId === 'number' ? loadRoutines(selectedCareUserId) : Promise.resolve()]);
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to update routine.');
      else setFormError('Unable to update routine.');
    } finally { setFormSubmitting(false); }
  };

  const onDeleteRoutine = async () => {
    if (!detail || formSubmitting) return;
    if (!window.confirm(`Delete routine "${detail.routine.titleEn}"? This will remove its steps and completion records as per backend behavior.`)) return;
    setFormSubmitting(true); setFormError(null); setInfo(null);
    try {
      await deleteRoutine(detail.routine.id);
      setInfo('Routine deleted successfully.');
      closeDetail();
      if (typeof selectedCareUserId === 'number') await loadRoutines(selectedCareUserId);
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to delete routine.');
      else setFormError('Unable to delete routine.');
    } finally { setFormSubmitting(false); }
  };

  const onToggleActive = async (r: Routine) => {
    if (formSubmitting) return;
    setFormSubmitting(true); setInfo(null); setError(null);
    try {
      await updateRoutine(r.id, { isActive: !r.isActive });
      setInfo(`Routine ${!r.isActive ? 'activated' : 'deactivated'} successfully.`);
      if (selectedRoutineId === r.id) await loadDetail(r.id);
      if (typeof selectedCareUserId === 'number') await loadRoutines(selectedCareUserId);
    } catch (e) {
      if (e instanceof ApiError) setError(getValidationMessages(e.details) || e.message || 'Unable to update routine status.');
      else setError('Unable to update routine status.');
    } finally { setFormSubmitting(false); }
  };

  // steps
  const startAddStep = () => { resetStepForm(); setStepFormMode('add'); };
  const startEditStep = (s: RoutineStep) => { setStepFormMode(s.id); setStepInstructionEn(s.instructionEn || ''); setStepInstructionBn(s.instructionBn || ''); setStepImageKey(s.imageKey || ''); setStepAudioHintKey(s.audioHintKey || ''); setStepError(null); };

  const submitStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || stepSubmitting || stepFormMode == null) return;
    setStepError(null); setInfo(null);
    if (!stepInstructionEn.trim()) { setStepError('Step instruction (English) is required.'); return; }
    setStepSubmitting(true);
    try {
      if (stepFormMode === 'add') {
        await addRoutineStep(detail.routine.id, { instructionEn: stepInstructionEn.trim(), instructionBn: stepInstructionBn.trim() || null, imageKey: stepImageKey.trim() || null, audioHintKey: stepAudioHintKey.trim() || null });
        setInfo('Step added successfully.');
      } else {
        await updateRoutineStep(detail.routine.id, stepFormMode, { instructionEn: stepInstructionEn.trim(), instructionBn: stepInstructionBn.trim() || null, imageKey: stepImageKey.trim() || null, audioHintKey: stepAudioHintKey.trim() || null });
        setInfo('Step updated successfully.');
      }
      resetStepForm();
      await Promise.all([loadDetail(detail.routine.id), typeof selectedCareUserId === 'number' ? loadRoutines(selectedCareUserId) : Promise.resolve()]);
    } catch (e) {
      if (e instanceof ApiError) setStepError(getValidationMessages(e.details) || e.message || 'Unable to save step.');
      else setStepError('Unable to save step.');
    } finally { setStepSubmitting(false); }
  };

  const onDeleteStep = async (stepId: number) => {
    if (!detail || stepSubmitting) return;
    if (!window.confirm('Delete this step? Remaining steps will be re-sequenced by the backend.')) return;
    setStepSubmitting(true); setStepError(null); setInfo(null);
    try {
      await deleteRoutineStep(detail.routine.id, stepId);
      setInfo('Step deleted successfully.');
      if (stepFormMode === stepId) resetStepForm();
      await Promise.all([loadDetail(detail.routine.id), typeof selectedCareUserId === 'number' ? loadRoutines(selectedCareUserId) : Promise.resolve()]);
    } catch (e) {
      if (e instanceof ApiError) setStepError(getValidationMessages(e.details) || e.message || 'Unable to delete step.');
      else setStepError('Unable to delete step.');
    } finally { setStepSubmitting(false); }
  };

  const moveStep = async (idx: number, dir: -1 | 1) => {
    if (!detail || stepSubmitting) return;
    const steps = [...detail.steps].sort((a,b)=>a.stepOrder-b.stepOrder);
    const j = idx + dir; if (j < 0 || j >= steps.length) return;
    const tmp = steps[idx]; steps[idx] = steps[j]; steps[j] = tmp;
    const ordered = steps.map(s=>s.id);
    setStepSubmitting(true); setStepError(null); setInfo(null);
    try {
      await reorderRoutineSteps(detail.routine.id, ordered);
      setInfo('Steps reordered successfully.');
      await loadDetail(detail.routine.id);
    } catch (e) {
      if (e instanceof ApiError) setStepError(getValidationMessages(e.details) || e.message || 'Unable to reorder steps.');
      else setStepError('Unable to reorder steps.');
    } finally { setStepSubmitting(false); }
  };

  return (
    <div className="page">
      {info ? <div className="alert alert-success" role="status">{info}</div> : null}

      <section className="card">
        <div className="card-header-row">
          <div>
            <h2>Daily Routines</h2>
            <p className="muted">Manage real routines for a linked care user (backend/MySQL). Scheduling/recurrence fields are not part of the current backend contract and are not shown. Progress/completions shown are genuine records only.</p>
          </div>
          <div className="row-actions">
            <button className="btn btn-outline" onClick={loadCareUsers} disabled={cuLoading}>Refresh care users</button>
            {typeof selectedCareUserId === 'number' ? <button className="btn btn-outline" onClick={() => loadRoutines(selectedCareUserId)} disabled={loading}>Refresh routines</button> : null}
            {typeof selectedCareUserId === 'number' ? <button className="btn btn-primary" onClick={() => { resetRoutineForm(); setShowCreate(v=>!v); setInfo(null); }}> {showCreate ? 'Close form' : 'Create routine'} </button> : null}
          </div>
        </div>

        {cuLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading linked care users…</div>
        : cuError ? <div><div className="alert alert-error" role="alert">{cuError}</div><button className="btn btn-primary btn-sm" onClick={loadCareUsers}>Retry</button></div>
        : !careUsers || careUsers.length === 0 ? <div className="empty-state"><p><strong>No linked care users found.</strong></p><p className="muted">Routines are scoped to a linked care user. No data is fabricated.</p></div>
        : (
          <div className="filters" style={{ marginTop: 8 }}>
            <label className="filter-item" style={{ maxWidth: 520 }}>
              <span>Care user</span>
              <select value={selectedCareUserId} onChange={e => setSelectedCareUserId(e.target.value ? Number(e.target.value) : '')} aria-label="Select care user">
                <option value="" disabled>Select a care user…</option>
                {careUsers.map(u => <option key={u.id} value={u.id}>{careUserLabel(u)}</option>)}
              </select>
            </label>
            <label className="filter-item"><span>Search (fetched)</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Title, description, ID…" /></label>
            <label className="filter-item"><span>Status</span><select value={activeFilter} onChange={e=>setActiveFilter(e.target.value as any)}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            {selectedCareUser ? <div className="muted small" style={{ alignSelf:'end' }}>Showing routines for <strong>{careUserLabel(selectedCareUser)}</strong>.</div> : null}
          </div>
        )}
      </section>

      {showCreate && typeof selectedCareUserId === 'number' ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Create routine</h3>
          <p className="muted">Only fields supported by the backend are submitted. No scheduling/recurrence fields exist in the current contract.</p>
          {formError ? <div className="alert alert-error" role="alert">{formError}</div> : null}
          <form onSubmit={submitCreate} noValidate className="form-grid">
            <div className="field"><label htmlFor="r-title">Title (English) *</label><input id="r-title" value={titleEn} onChange={e=>setTitleEn(e.target.value)} disabled={formSubmitting} />{fieldErrors.titleEn ? <div className="field-error">{fieldErrors.titleEn}</div> : null}</div>
            <div className="field"><label htmlFor="r-title-bn">Title (Bengali)</label><input id="r-title-bn" value={titleBn} onChange={e=>setTitleBn(e.target.value)} disabled={formSubmitting} />{fieldErrors.titleBn ? <div className="field-error">{fieldErrors.titleBn}</div> : null}</div>
            <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="r-desc">Description (English)</label><input id="r-desc" value={descEn} onChange={e=>setDescEn(e.target.value)} disabled={formSubmitting} /></div>
            <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="r-desc-bn">Description (Bengali)</label><input id="r-desc-bn" value={descBn} onChange={e=>setDescBn(e.target.value)} disabled={formSubmitting} /></div>
            <div className="field"><label htmlFor="r-icon">Icon key</label><input id="r-icon" value={iconKey} onChange={e=>setIconKey(e.target.value)} disabled={formSubmitting} />{fieldErrors.iconKey ? <div className="field-error">{fieldErrors.iconKey}</div> : null}</div>
            <div className="field"><label style={{ display:'flex', gap:8, alignItems:'center', fontWeight:600 }}><input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} disabled={formSubmitting} /> Active</label></div>
            <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={formSubmitting}>{formSubmitting ? 'Creating…' : 'Create routine'}</button><button type="button" className="btn btn-outline" onClick={()=>{ setShowCreate(false); resetRoutineForm(); }} disabled={formSubmitting}>Cancel</button></div>
          </form>
        </section>
      ) : null}

      {typeof selectedCareUserId === 'number' ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Routines</h3>
          {loading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading routines…</div>
          : error ? <div><div className="alert alert-error" role="alert">{error}</div><button className="btn btn-primary btn-sm" onClick={()=>loadRoutines(selectedCareUserId)}>Retry</button></div>
          : routines && routines.length === 0 ? <div className="empty-state"><p><strong>No routines found.</strong></p><p className="muted">The server returned an empty list for this care user. No routines are fabricated.</p></div>
          : filteredRoutines.length === 0 ? <div className="empty-state"><p>No routines match the current search/filter (applied over fetched data).</p></div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Routine</th><th>Status</th><th>Steps</th><th>Today’s progress (actual)</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredRoutines.map(r => {
                    const p = progressByRoutine.get(r.id);
                    return (
                      <tr key={r.id}>
                        <td><div className="cu-name">{r.titleEn}</div><div className="muted small">ID: {r.id}{r.titleBn ? ` · BN: ${r.titleBn}` : ''}{r.descriptionEn ? ` · ${r.descriptionEn}` : ''}</div></td>
                        <td><span className={`status-badge ${r.isActive ? 'ok' : 'muted-b'}`}>{r.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>{r.stepCount ?? (r.steps?.length ?? '—')}</td>
                        <td>{p ? <span>{p.completedSteps}/{p.totalSteps} steps · {p.progressPercent}% · {p.status} <span className="muted small">(records: {p.completionRecords})</span></span> : <span className="muted small">No progress data returned</span>}</td>
                        <td><div className="row-actions"><button className="btn btn-outline btn-sm" onClick={()=>openDetail(r.id)}>Manage</button><button className="btn btn-outline btn-sm" onClick={()=>onToggleActive(r)} disabled={formSubmitting}>{r.isActive ? 'Deactivate' : 'Activate'}</button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="muted small">Showing {filteredRoutines.length} of {routines?.length || 0} fetched routine(s). Progress is backend-computed for today; no fabricated percentages.</p>
            </div>
          )}
        </section>
      ) : null}

      {selectedRoutineId ? (
        <section className="card">
          <div className="card-header-row">
            <div><h3 style={{ margin: 0 }}>Routine details & steps</h3><p className="muted">Real routine, ordered steps, and completion records from backend. No auto-completion.</p></div>
            <div className="row-actions">
              <button className="btn btn-outline" onClick={closeDetail}>Close</button>
              <button className="btn btn-outline" onClick={()=>loadDetail(selectedRoutineId)} disabled={detailLoading}>Refresh</button>
              {detail ? <button className="btn btn-primary" onClick={startEditRoutine} disabled={formSubmitting}>Edit routine</button> : null}
            </div>
          </div>

          {detailLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading routine…</div> : null}
          {detailError ? <div className="alert alert-error" role="alert">{detailError}</div> : null}
          {formError && detail ? <div className="alert alert-error" role="alert">{formError}</div> : null}

          {detail && !editRoutineMode ? (
            <div>
              <dl className="details">
                <div><dt>ID</dt><dd>{detail.routine.id}</dd></div>
                <div><dt>Title (EN)</dt><dd>{detail.routine.titleEn}</dd></div>
                <div><dt>Title (BN)</dt><dd>{detail.routine.titleBn || '—'}</dd></div>
                <div><dt>Description (EN)</dt><dd>{detail.routine.descriptionEn || '—'}</dd></div>
                <div><dt>Description (BN)</dt><dd>{detail.routine.descriptionBn || '—'}</dd></div>
                <div><dt>Icon key</dt><dd>{detail.routine.iconKey || '—'}</dd></div>
                <div><dt>Status</dt><dd><span className={`status-badge ${detail.routine.isActive ? 'ok' : 'muted-b'}`}>{detail.routine.isActive ? 'Active' : 'Inactive'}</span></dd></div>
                <div><dt>Steps count</dt><dd>{detail.steps.length}</dd></div>
              </dl>
              <div className="row-actions" style={{ margin:'8px 0 12px' }}>
                <button className="btn btn-outline" onClick={()=>onToggleActive(detail.routine)} disabled={formSubmitting}>{detail.routine.isActive ? 'Deactivate routine' : 'Activate routine'}</button>
                <button className="btn btn-outline" onClick={onDeleteRoutine} disabled={formSubmitting}>Delete routine</button>
              </div>

              <div className="section-divider" />
              <div className="card-header-row"><h4 style={{ margin:0 }}>Steps (ordered)</h4><button className="btn btn-outline btn-sm" onClick={startAddStep} disabled={stepSubmitting}>Add step</button></div>
              {stepError ? <div className="alert alert-error" role="alert">{stepError}</div> : null}
              {detail.steps.length === 0 ? <div className="empty-state"><p><strong>No steps.</strong></p><p className="muted">Server returned no steps for this routine.</p></div> : (
                <div className="table-wrap"><table className="data-table"><thead><tr><th>Order</th><th>Instruction (EN/BN)</th><th>Image/Audio keys</th><th>Actions</th></tr></thead><tbody>
                  {detail.steps.map((s, idx) => (
                    <tr key={s.id}><td>{s.stepOrder}</td><td><div>{s.instructionEn}</div>{s.instructionBn ? <div className="muted small">BN: {s.instructionBn}</div> : null}</td><td><div className="muted small">image: {s.imageKey || '—'} · audio: {s.audioHintKey || '—'}</div></td>
                      <td><div className="row-actions"><button className="btn btn-outline btn-sm" onClick={()=>moveStep(idx,-1)} disabled={stepSubmitting || idx===0}>Up</button><button className="btn btn-outline btn-sm" onClick={()=>moveStep(idx,1)} disabled={stepSubmitting || idx===detail.steps.length-1}>Down</button><button className="btn btn-outline btn-sm" onClick={()=>startEditStep(s)} disabled={stepSubmitting}>Edit</button><button className="btn btn-outline btn-sm" onClick={()=>onDeleteStep(s.id)} disabled={stepSubmitting}>Delete</button></div></td></tr>
                  ))}
                </tbody></table></div>
              )}

              {stepFormMode != null ? (
                <form onSubmit={submitStep} className="form-grid" style={{ marginTop: 12 }} noValidate>
                  <h4 style={{ gridColumn:'1 / -1', margin:0 }}>{stepFormMode === 'add' ? 'Add step' : `Edit step #${stepFormMode}`}</h4>
                  <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="s-en">Instruction (English) *</label><input id="s-en" value={stepInstructionEn} onChange={e=>setStepInstructionEn(e.target.value)} disabled={stepSubmitting} /></div>
                  <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="s-bn">Instruction (Bengali)</label><input id="s-bn" value={stepInstructionBn} onChange={e=>setStepInstructionBn(e.target.value)} disabled={stepSubmitting} /></div>
                  <div className="field"><label htmlFor="s-img">Image key</label><input id="s-img" value={stepImageKey} onChange={e=>setStepImageKey(e.target.value)} disabled={stepSubmitting} /></div>
                  <div className="field"><label htmlFor="s-aud">Audio hint key</label><input id="s-aud" value={stepAudioHintKey} onChange={e=>setStepAudioHintKey(e.target.value)} disabled={stepSubmitting} /></div>
                  <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={stepSubmitting}>{stepSubmitting ? 'Saving…' : 'Save step'}</button><button type="button" className="btn btn-outline" onClick={resetStepForm} disabled={stepSubmitting}>Cancel</button></div>
                </form>
              ) : null}

              <div className="section-divider" />
              <div className="card-header-row"><h4 style={{ margin:0 }}>Completion history (genuine records)</h4>
                <div className="row-actions" style={{ alignItems:'center' }}>
                  <label className="muted small">Date <input type="date" value={completionDate} onChange={e=>setCompletionDate(e.target.value)} style={{ marginLeft:6 }} /></label>
                  <button className="btn btn-outline btn-sm" onClick={()=>loadCompletions(detail.routine.id, completionDate)} disabled={completionLoading}>Load</button>
                </div>
              </div>
              <p className="muted small">Read-only view of backend completion records (e.g. from mobile MY DAY). Dashboard does not create/modify completion records.</p>
              {completionLoading ? <div className="inline-loading"><span className="spinner sm" /> Loading completions…</div>
              : completionError ? <div className="alert alert-error" role="alert">{completionError}</div>
              : completions && completions.length === 0 ? <div className="empty-state"><p><strong>No completion records found</strong> for this routine/date.</p></div>
              : completions ? (
                <div className="table-wrap"><table className="data-table"><thead><tr><th>ID</th><th>Step ID</th><th>Status</th><th>Completed at</th><th>Source</th><th>Notes</th></tr></thead><tbody>
                  {completions.map(c => (<tr key={c.id}><td>{c.id}</td><td>{c.routineStepId}</td><td>{c.completionStatus}</td><td>{fmt(c.completedAt)}</td><td>{c.source || '—'}</td><td>{c.notes || '—'}</td></tr>))}
                </tbody></table></div>
              ) : <div className="muted small">Load completions for a date to view records.</div>}
            </div>
          ) : null}

          {detail && editRoutineMode ? (
            <form onSubmit={submitEditRoutine} noValidate className="form-grid">
              {formError ? <div className="alert alert-error" role="alert">{formError}</div> : null}
              <div className="field"><label htmlFor="er-title">Title (English) *</label><input id="er-title" value={titleEn} onChange={e=>setTitleEn(e.target.value)} disabled={formSubmitting} />{fieldErrors.titleEn ? <div className="field-error">{fieldErrors.titleEn}</div> : null}</div>
              <div className="field"><label htmlFor="er-title-bn">Title (Bengali)</label><input id="er-title-bn" value={titleBn} onChange={e=>setTitleBn(e.target.value)} disabled={formSubmitting} /></div>
              <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="er-desc">Description (English)</label><input id="er-desc" value={descEn} onChange={e=>setDescEn(e.target.value)} disabled={formSubmitting} /></div>
              <div className="field" style={{ gridColumn:'1 / -1' }}><label htmlFor="er-desc-bn">Description (Bengali)</label><input id="er-desc-bn" value={descBn} onChange={e=>setDescBn(e.target.value)} disabled={formSubmitting} /></div>
              <div className="field"><label htmlFor="er-icon">Icon key</label><input id="er-icon" value={iconKey} onChange={e=>setIconKey(e.target.value)} disabled={formSubmitting} /></div>
              <div className="field"><label style={{ display:'flex', gap:8, alignItems:'center', fontWeight:600 }}><input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} disabled={formSubmitting} /> Active</label></div>
              <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={formSubmitting}>{formSubmitting ? 'Saving…' : 'Save changes'}</button><button type="button" className="btn btn-outline" onClick={()=>{ setEditRoutineMode(false); setFormError(null); }} disabled={formSubmitting}>Cancel</button></div>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
