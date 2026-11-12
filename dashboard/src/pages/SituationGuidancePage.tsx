import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import { getSituation, listSituations } from '../services/situationApi';
import type { SituationDetail, SituationStep, SituationSummary } from '../types/situation';

function titleFor(s: { titleEn?: string | null; titleBn?: string | null; situationKey: string }) {
  return s.titleEn || s.titleBn || s.situationKey;
}

export function SituationGuidancePage() {
  const { sessionStatus } = useAuth();
  const [situations, setSituations] = useState<SituationSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'true' | 'all'>('true');
  const [info, setInfo] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<SituationDetail | null>(null);
  const [steps, setSteps] = useState<SituationStep[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (sessionStatus === 'offline_unverified') {
      setLoading(false);
      setError('Cannot load situation guidance while session verification is pending. Please retry when connected.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await listSituations(activeFilter);
      setSituations(res.data.situations || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Your session is no longer valid. Please sign in again.');
        else setError(e.message || 'Unable to load situation guidance.');
      } else setError('Unable to load situation guidance.');
      setSituations(null);
    } finally { setLoading(false); }
  }, [sessionStatus, activeFilter]);

  const loadDetail = useCallback(async (key: string) => {
    setDetailLoading(true); setDetailError(null); setInfo(null);
    try {
      const res = await getSituation(key);
      const ordered = (res.data.steps || []).slice().sort((a, b) => a.stepOrder - b.stepOrder);
      setDetail(res.data.situation);
      setSteps(ordered);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setDetailError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 404) setDetailError('Situation not found.');
        else setDetailError(e.message || 'Unable to load situation details.');
      } else setDetailError('Unable to load situation details.');
      setDetail(null); setSteps([]);
    } finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (selectedKey) loadDetail(selectedKey);
    else { setDetail(null); setSteps([]); setDetailError(null); }
  }, [selectedKey, loadDetail]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (situations || []).filter(s => {
      if (!q) return true;
      return `${s.situationKey} ${s.titleEn || ''} ${s.titleBn || ''}`.toLowerCase().includes(q);
    });
  }, [situations, search]);

  return (
    <div className="page">
      {info ? <div className="alert alert-success" role="status">{info}</div> : null}

      <section className="card">
        <div className="card-header-row">
          <div>
            <h2>Situation Guidance (HELP ME)</h2>
            <p className="muted">
              Global/predefined situation guidance catalogue used by the mobile HELP ME module (backend/MySQL). Current backend contract is <strong>read-only</strong> (list/detail/steps retrieval only). No create/update/delete/reorder APIs exist, so no management controls are exposed. Guidance is displayed as stored (deterministic) — no AI-generated medical/legal/emergency advice, no auto SOS/contact claims.
            </p>
          </div>
          <div className="row-actions">
            <button className="btn btn-outline" onClick={load} disabled={loading}>Refresh</button>
          </div>
        </div>

        <div className="filters" style={{ marginTop: 8 }}>
          <label className="filter-item"><span>Search (fetched)</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Key, English/Bengali title…" /></label>
          <label className="filter-item"><span>Active filter (API)</span>
            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as any)}>
              <option value="true">Active (default)</option>
              <option value="all">All (include inactive)</option>
            </select>
          </label>
          <div className="muted small" style={{ alignSelf: 'end' }}>Showing {filtered.length} of {(situations || []).length} fetched situation(s). No category field exists in backend schema (category filtering not supported). Counts from real fetched data only.</div>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Situations</h3>
        {loading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading situations…</div>
        : error ? <div><div className="alert alert-error" role="alert">{error}</div><button className="btn btn-primary btn-sm" onClick={load}>Retry</button></div>
        : situations && situations.length === 0 ? <div className="empty-state"><p><strong>No situations found.</strong></p><p className="muted">The server returned an empty situation catalogue (read-only). No guidance is fabricated. Mobile HELP ME shows an honest empty state until real guidance records exist in the database.</p></div>
        : filtered.length === 0 ? <div className="empty-state"><p>No situations match the current search/filter (applied over fetched data).</p></div>
        : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Situation key</th><th>Title (English)</th><th>Title (Bengali)</th><th>Steps</th><th>Type / Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={`${s.situationKey}-${s.careUserId ?? 'global'}`}>
                    <td><div className="cu-name">{s.situationKey}</div><div className="muted small">Care user: {s.careUserId ?? 'Global/Predefined'}</div></td>
                    <td>{s.titleEn || <span className="muted">—</span>}</td>
                    <td>{s.titleBn || <span className="muted">— (not provided)</span>}</td>
                    <td>{s.stepCount}</td>
                    <td>
                      <div className="muted small">{s.isPredefined ? 'Predefined' : 'Custom'}</div>
                      <span className={`status-badge ${s.isActive ? 'ok' : 'muted-b'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => setSelectedKey(s.situationKey)}>View details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedKey ? (
        <section className="card">
          <div className="card-header-row">
            <div>
              <h3 style={{ margin: 0 }}>Situation details & steps</h3>
              <p className="muted">Read-only view of stored guidance. English/Bengali shown as stored (no auto-translation/fabrication). Step order preserved from backend (`stepOrder`).</p>
            </div>
            <div className="row-actions">
              <button className="btn btn-outline" onClick={() => loadDetail(selectedKey)} disabled={detailLoading}>Refresh details</button>
              <button className="btn btn-outline" onClick={() => setSelectedKey(null)}>Close</button>
            </div>
          </div>

          {detailLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading situation details…</div> : null}
          {detailError ? <div className="alert alert-error" role="alert">{detailError}</div> : null}

          {detail ? (
            <div>
              <dl className="details">
                <div><dt>Situation key</dt><dd>{detail.situationKey}</dd></div>
                <div><dt>Title (EN)</dt><dd>{detail.titleEn || '—'}</dd></div>
                <div><dt>Title (BN)</dt><dd>{detail.titleBn || '— (not provided)'}</dd></div>
                <div><dt>Scope</dt><dd>{detail.careUserId == null ? 'Global/Predefined' : `Care user #${detail.careUserId}`}</dd></div>
                <div><dt>Type</dt><dd>{detail.isPredefined ? 'Predefined' : 'Custom'}</dd></div>
                <div><dt>Status</dt><dd><span className={`status-badge ${detail.isActive ? 'ok' : 'muted-b'}`}>{detail.isActive ? 'Active' : 'Inactive'}</span></dd></div>
                <div><dt>Step count</dt><dd>{detail.stepCount}</dd></div>
              </dl>

              <div className="alert alert-info" role="note" style={{ marginTop: 8 }}>
                <strong>Safety:</strong> Guidance shown is stored/deterministic backend content only. No AI-generated medical, legal, or emergency advice. Viewing guidance does not contact caregivers or trigger SOS. Existing mobile HELP ME safety behavior is unchanged.
              </div>

              <h4 style={{ marginTop: 16 }}>Ordered steps</h4>
              {steps.length === 0 ? (
                <div className="empty-state"><p><strong>No steps found.</strong></p><p className="muted">Server returned no steps for this situation.</p></div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Order / ID</th><th>Instruction (English)</th><th>Instruction (Bengali)</th><th>Image key</th><th>Status</th></tr></thead>
                    <tbody>
                      {steps.map(step => (
                        <tr key={step.id}>
                          <td><div className="cu-name">Step {step.stepOrder}</div><div className="muted small">ID: {step.id}</div></td>
                          <td>{step.instructionEn || <span className="muted">—</span>}</td>
                          <td>{step.instructionBn || <span className="muted">— (not provided)</span>}</td>
                          <td>{step.imageKey || <span className="muted">—</span>}</td>
                          <td><span className={`status-badge ${step.isActive ? 'ok' : 'muted-b'}`}>{step.isActive ? 'Active' : 'Inactive'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
