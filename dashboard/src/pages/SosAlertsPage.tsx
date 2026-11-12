import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, getValidationMessages } from '../services/apiClient';
import { getLinkedCareUsers } from '../services/careUserApi';
import { acknowledgeSosAlert, getSosAlert, listSosAlerts } from '../services/sosApi';
import type { CareUser } from '../types/auth';
import type { SosAlert, SosAlertStatus } from '../types/sos';

const ACKABLE: SosAlertStatus[] = ['created', 'pending', 'sent', 'failed'];

function careUserLabel(u: CareUser) {
  return `${u.displayName || u.fullName || `Care user #${u.id}`} (#${u.id})`;
}

function fmt(dt?: string | null) {
  if (!dt) return '—';
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? String(dt) : d.toLocaleString();
}

function statusBadgeClass(s: SosAlertStatus) {
  if (s === 'acknowledged') return 'status-badge ok';
  if (s === 'failed' || s === 'cancelled') return 'status-badge muted-b';
  return 'status-badge';
}

export function SosAlertsPage() {
  const { sessionStatus } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = Number(searchParams.get('careUserId'));

  const [careUsers, setCareUsers] = useState<CareUser[] | null>(null);
  const [cuLoading, setCuLoading] = useState(true);
  const [cuError, setCuError] = useState<string | null>(null);
  const [selectedCareUserId, setSelectedCareUserId] = useState<number | ''>('');

  const [alerts, setAlerts] = useState<SosAlert[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | SosAlertStatus>('all');

  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SosAlert | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [ackSubmitting, setAckSubmitting] = useState(false);

  const selectedCareUser = useMemo(() => (careUsers || []).find(u => u.id === selectedCareUserId) || null, [careUsers, selectedCareUserId]);

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

  const loadAlerts = useCallback(async (careUserId: number) => {
    if (sessionStatus === 'offline_unverified') {
      setError('Cannot load SOS alerts while session verification is pending. Please retry when connected.');
      setAlerts(null);
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await listSosAlerts(careUserId);
      setAlerts(res.data.alerts || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setError('You are not authorized to view SOS alerts for this care user.');
        else if (e.status === 404) setError('Care user or SOS alerts not found.');
        else setError(e.message || 'Unable to load SOS alerts.');
      } else setError('Unable to load SOS alerts.');
      setAlerts(null);
    } finally { setLoading(false); }
  }, [sessionStatus]);

  const loadDetail = useCallback(async (alertId: number) => {
    setDetailLoading(true); setDetailError(null);
    try {
      const res = await getSosAlert(alertId);
      setDetail(res.data.alert);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setDetailError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setDetailError('You are not authorized to view this SOS alert.');
        else if (e.status === 404) setDetailError('SOS alert not found.');
        else setDetailError(e.message || 'Unable to load SOS alert details.');
      } else setDetailError('Unable to load SOS alert details.');
      setDetail(null);
    } finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { loadCareUsers(); }, [loadCareUsers]);
  useEffect(() => {
    if (typeof selectedCareUserId === 'number' && selectedCareUserId > 0) {
      setInfo(null); setSelectedAlertId(null); setDetail(null); setDetailError(null);
      loadAlerts(selectedCareUserId);
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('careUserId', String(selectedCareUserId)); return p; }, { replace: true });
    } else {
      setAlerts(null); setSelectedAlertId(null); setDetail(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCareUserId]);

  const filtered = useMemo(() => {
    const list = alerts || [];
    if (statusFilter === 'all') return list;
    return list.filter(a => a.alertStatus === statusFilter);
  }, [alerts, statusFilter]);

  const openDetail = (id: number) => { setSelectedAlertId(id); setInfo(null); setDetailError(null); loadDetail(id); };

  const refreshAll = async () => {
    if (typeof selectedCareUserId === 'number') {
      await loadAlerts(selectedCareUserId);
      if (selectedAlertId) await loadDetail(selectedAlertId);
    }
  };

  const onAcknowledge = async () => {
    if (!detail || ackSubmitting) return;
    if (!ACKABLE.includes(detail.alertStatus)) return;
    const ok = window.confirm(`Acknowledge SOS alert #${detail.id}? This records caregiver acknowledgement only and does not mean the emergency has ended or that any external service was contacted.`);
    if (!ok) return;
    setAckSubmitting(true); setInfo(null); setDetailError(null);
    try {
      const res = await acknowledgeSosAlert(detail.id);
      setDetail(res.data.alert);
      setInfo(`SOS alert #${detail.id} acknowledged successfully (server-confirmed).`);
      if (typeof selectedCareUserId === 'number') await loadAlerts(selectedCareUserId);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) {
          setDetailError(getValidationMessages(e.details) || e.message || 'SOS alert is already acknowledged or in a conflicting state (409). Refreshed state shown.');
          await refreshAll();
        } else if (e.status === 401) setDetailError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setDetailError('You are not authorized to acknowledge this SOS alert.');
        else if (e.status === 404) setDetailError('SOS alert not found.');
        else setDetailError(getValidationMessages(e.details) || e.message || 'Unable to acknowledge SOS alert.');
      } else setDetailError('Unable to acknowledge SOS alert.');
    } finally { setAckSubmitting(false); }
  };

  return (
    <div className="page">
      {info ? <div className="alert alert-success" role="status">{info}</div> : null}

      <section className="card">
        <div className="card-header-row">
          <div>
            <h2>SOS Alerts</h2>
            <p className="muted">Genuine SOS alerts for linked care users (backend/MySQL). Statuses shown are exactly as returned by the backend. <strong>No external SMS/email/push/emergency-service delivery is confirmed</strong> by this system. Acknowledgement records caregiver response only and does not mean the emergency has ended.</p>
          </div>
          <div className="row-actions">
            <button className="btn btn-outline" onClick={loadCareUsers} disabled={cuLoading}>Refresh care users</button>
            {typeof selectedCareUserId === 'number' ? <button className="btn btn-outline" onClick={() => loadAlerts(selectedCareUserId)} disabled={loading}>Refresh alerts</button> : null}
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
            <p className="muted">SOS alerts are scoped to linked care users. Link or create a care user first. No alerts are fabricated.</p>
          </div>
        ) : (
          <div className="filters" style={{ marginTop: 8 }}>
            <label className="filter-item" style={{ maxWidth: 520 }}>
              <span>Care user</span>
              <select value={selectedCareUserId} onChange={e => setSelectedCareUserId(e.target.value ? Number(e.target.value) : '')} aria-label="Select care user">
                <option value="" disabled>Select a care user…</option>
                {careUsers.map(u => <option key={u.id} value={u.id}>{careUserLabel(u)}</option>)}
              </select>
            </label>
            <label className="filter-item">
              <span>Status (fetched data)</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="created">created</option>
                <option value="pending">pending</option>
                <option value="sent">sent</option>
                <option value="failed">failed</option>
                <option value="acknowledged">acknowledged</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            {selectedCareUser ? <div className="muted small" style={{ alignSelf: 'end' }}>Showing alerts for <strong>{careUserLabel(selectedCareUser)}</strong> (backend-authorized). No &quot;RESOLVED&quot; status exists.</div> : null}
          </div>
        )}
      </section>

      {typeof selectedCareUserId === 'number' ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Alert history</h3>
          {loading ? (
            <div className="inline-loading" role="status" aria-live="polite"><span className="spinner sm" aria-hidden="true" /> Loading SOS alerts…</div>
          ) : error ? (
            <div>
              <div className="alert alert-error" role="alert">{error}</div>
              <button className="btn btn-primary btn-sm" onClick={() => loadAlerts(selectedCareUserId)}>Retry</button>
            </div>
          ) : alerts && alerts.length === 0 ? (
            <div className="empty-state">
              <p><strong>No SOS alerts found.</strong></p>
              <p className="muted">The server returned an empty alert history for this care user. No alerts are fabricated.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><p>No alerts match the selected status filter (applied over fetched data).</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Alert</th>
                    <th>Status</th>
                    <th>Triggered</th>
                    <th>Location</th>
                    <th>Acknowledged</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td><div className="cu-name">Alert #{a.id}</div><div className="muted small">Care user ID: {a.careUserId}</div></td>
                      <td><span className={statusBadgeClass(a.alertStatus)}>{a.alertStatus}</span></td>
                      <td>{fmt(a.triggeredAt)}</td>
                      <td>{a.latitude != null && a.longitude != null ? `${a.latitude}, ${a.longitude}` : <span className="muted small">No location recorded ({a.locationStatus})</span>}</td>
                      <td>{a.acknowledgedAt ? <span>{fmt(a.acknowledgedAt)}{a.acknowledgedBy ? ` (by #${a.acknowledgedBy})` : ''}</span> : <span className="muted small">Not acknowledged</span>}</td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => openDetail(a.id)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">Showing {filtered.length} of {alerts?.length || 0} fetched alert(s). Sorted by backend (triggered time desc).</p>
            </div>
          )}
        </section>
      ) : null}

      {selectedAlertId ? (
        <section className="card">
          <div className="card-header-row">
            <div>
              <h3 style={{ margin: 0 }}>Alert detail</h3>
              <p className="muted">Detail loaded from backend for an authorized alert. Delivery fields reflect stored/dashboard state only; external delivery is not confirmed.</p>
            </div>
            <div className="row-actions">
              <button className="btn btn-outline" onClick={() => { setSelectedAlertId(null); setDetail(null); setDetailError(null); }}>Close</button>
              <button className="btn btn-outline" onClick={() => loadDetail(selectedAlertId)} disabled={detailLoading}>Refresh</button>
              {detail && ACKABLE.includes(detail.alertStatus) ? (
                <button className="btn btn-primary" onClick={onAcknowledge} disabled={ackSubmitting}>{ackSubmitting ? 'Acknowledging…' : 'Acknowledge'}</button>
              ) : null}
            </div>
          </div>

          {detailLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading alert…</div> : null}
          {detailError ? <div className="alert alert-error" role="alert">{detailError}</div> : null}

          {detail ? (
            <div>
              <dl className="details">
                <div><dt>Alert ID</dt><dd>{detail.id}</dd></div>
                <div><dt>Care user</dt><dd>{selectedCareUser ? `${careUserLabel(selectedCareUser)} (ID ${detail.careUserId})` : `ID ${detail.careUserId}`}</dd></div>
                <div><dt>Alert status (actual)</dt><dd><span className={statusBadgeClass(detail.alertStatus)}>{detail.alertStatus}</span></dd></div>
                <div><dt>Triggered at</dt><dd>{fmt(detail.triggeredAt)}</dd></div>
                <div><dt>Location status</dt><dd>{detail.locationStatus}</dd></div>
                <div><dt>Latitude</dt><dd>{detail.latitude != null ? detail.latitude : '— (not recorded)'}</dd></div>
                <div><dt>Longitude</dt><dd>{detail.longitude != null ? detail.longitude : '— (not recorded)'}</dd></div>
                <div><dt>Delivery status (stored)</dt><dd>{detail.deliveryStatus}</dd></div>
                <div><dt>Delivery channel</dt><dd>{detail.deliveryChannel || '—'}</dd></div>
                <div><dt>Delivery message (stored)</dt><dd>{detail.deliveryMessage || '—'}</dd></div>
                <div><dt>Failure reason</dt><dd>{detail.failureReason || '—'}</dd></div>
                <div><dt>Acknowledged at</dt><dd>{fmt(detail.acknowledgedAt)}</dd></div>
                <div><dt>Acknowledged by (caregiver ID)</dt><dd>{detail.acknowledgedBy ?? '—'}</dd></div>
                <div><dt>Emergency contact ID</dt><dd>{detail.emergencyContactId ?? '—'}</dd></div>
                <div><dt>Created at</dt><dd>{fmt(detail.createdAt)}</dd></div>
                <div><dt>Updated at</dt><dd>{fmt(detail.updatedAt)}</dd></div>
              </dl>
              {detail.alertStatus === 'acknowledged' ? (
                <p className="muted" style={{ marginTop: 12 }}>This alert is acknowledged (caregiver response recorded). Acknowledgement does not mean the emergency has ended and no external delivery is confirmed.</p>
              ) : detail.alertStatus === 'cancelled' ? (
                <p className="muted" style={{ marginTop: 12 }}>This alert is in <strong>cancelled</strong> state (as returned by backend). No &quot;RESOLVED&quot; status is supported by the current schema.</p>
              ) : ACKABLE.includes(detail.alertStatus) ? (
                <p className="muted" style={{ marginTop: 12 }}>This alert can be acknowledged by an authorized linked caregiver. Acknowledgement requires explicit confirmation and is recorded only after server confirmation.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
