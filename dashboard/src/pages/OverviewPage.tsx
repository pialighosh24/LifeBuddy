import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLinkedCareUsers } from '../services/careUserApi';
import { ApiError } from '../services/apiClient';
import type { CareUser } from '../types/auth';

export function OverviewPage() {
  const { user, sessionStatus } = useAuth();
  const [careUsers, setCareUsers] = useState<CareUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (sessionStatus === 'offline_unverified') {
      setLoading(false);
      setError('Cannot load care-user information while session verification is pending. Please retry when connected.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getLinkedCareUsers();
      setCareUsers(res.data.careUsers || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setError('You are not authorized to view linked care users.');
        else setError(e.message || 'Unable to load care-user information.');
      } else {
        setError('Unable to load care-user information.');
      }
      setCareUsers(null);
    } finally {
      setLoading(false);
    }
  }, [sessionStatus]);

  useEffect(() => { load(); }, [load]);

  const caregiverName = user?.displayName || user?.fullName || user?.email || 'Caregiver';

  return (
    <div className="page">
      <section className="welcome-card">
        <h2>Welcome, {caregiverName}</h2>
        <p className="muted">This overview shows information available from the Life Buddy backend for your caregiver account. Only real, authorized data is displayed.</p>
      </section>

      <section className="grid two">
        <div className="card">
          <h3>Caregiver profile</h3>
          <dl className="details">
            <div><dt>Name</dt><dd>{user?.fullName || user?.displayName || 'Not available'}</dd></div>
            <div><dt>Email</dt><dd>{user?.email || 'Not available'}</dd></div>
            <div><dt>Role</dt><dd>{user?.role || 'caregiver'}</dd></div>
            <div><dt>Preferred language</dt><dd>{user?.preferredLanguage || 'Not specified'}</dd></div>
          </dl>
        </div>

        <div className="card">
          <h3>Linked care users</h3>
          {loading ? (
            <div className="inline-loading" role="status" aria-live="polite"><span className="spinner sm" aria-hidden="true" /> Loading linked care users…</div>
          ) : error ? (
            <div>
              <div className="alert alert-error" role="alert">{error}</div>
              <button className="btn btn-primary btn-sm" onClick={load}>Retry</button>
            </div>
          ) : careUsers && careUsers.length > 0 ? (
            <div>
              <p className="muted">Linked care users returned by the server: <strong>{careUsers.length}</strong></p>
              <ul className="care-user-list">
                {careUsers.map(cu => (
                  <li key={cu.id} className="care-user-item">
                    <div className="care-user-main">
                      <span className="avatar sm" aria-hidden="true">{(cu.displayName || cu.fullName || 'U').charAt(0).toUpperCase()}</span>
                      <div>
                        <div className="cu-name">{cu.displayName || cu.fullName || `Care user #${cu.id}`}</div>
                        <div className="muted small">ID: {cu.id} · Status: {cu.status || 'unknown'}{cu.link?.relationshipType ? ` · ${cu.link.relationshipType}` : ''}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="muted small">Detailed care-user management features will be available in later Phase 6 modules.</p>
            </div>
          ) : (
            <div className="empty-state">
              <p><strong>No linked care users found.</strong></p>
              <p className="muted">The server returned an empty list for your caregiver account. You can create and manage linked care users from the Care Users module.</p>
              <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h3>Quick navigation</h3>
        <p className="muted">Implemented modules are available below. Remaining modules (if any) are planned for later phases and show placeholders when not yet implemented.</p>
        <div className="quick-links">
          <Link className="quick-link" to="/dashboard/care-users">Care Users <span className="tag tag-ok">Available</span></Link>
          <Link className="quick-link" to="/dashboard/emergency-contacts">Emergency Contacts <span className="tag tag-ok">Available</span></Link>
          <Link className="quick-link" to="/dashboard/sos-alerts">SOS Alerts <span className="tag tag-ok">Available</span></Link>
          <Link className="quick-link" to="/dashboard/routines">Daily Routines <span className="tag tag-ok">Available</span></Link>
          <Link className="quick-link" to="/dashboard/medicines">Medicines <span className="tag tag-ok">Available</span></Link>
          <Link className="quick-link" to="/dashboard/communication">Communication <span className="tag tag-ok">Available</span></Link>
          <Link className="quick-link" to="/dashboard/situations">Situation Guidance <span className="tag tag-ok">Available</span></Link>
        </div>
      </section>

      <section className="card info">
        <h3>Data and status notes</h3>
        <ul className="notes">
          <li>All information shown here is retrieved from the existing backend/MySQL APIs; no fabricated metrics are displayed.</li>
          <li>Counts/statistics are shown only when derived from real API responses (e.g. the linked care-user list). If an API does not provide a metric, it is not invented.</li>
          <li>SOS, routine, medicine, and other summaries will appear when supported endpoints and real data are available in later phases.</li>
        </ul>
      </section>
    </div>
  );
}
