import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, getValidationMessages } from '../services/apiClient';
import { getLinkedCareUsers } from '../services/careUserApi';
import {
  createCommunicationItem,
  deactivateCommunicationItem,
  getCommunicationCategories,
  listCommunicationItems,
  listFavourites,
  updateCommunicationItem,
} from '../services/communicationApi';
import type { CareUser } from '../types/auth';
import type {
  CommunicationCategory,
  CommunicationItem,
  CreateCommunicationItemPayload,
  FavouritePhrase,
  UpdateCommunicationItemPayload,
} from '../types/communication';

const SENTENCE_ROLES: CommunicationItem['sentenceRole'][] = ['subject', 'object', 'need', 'feeling', 'action', 'modifier', 'yesno', 'other'];

function careUserLabel(u: CareUser) { return `${u.displayName || u.fullName || `Care user #${u.id}`} (#${u.id})`; }

export function CommunicationPage() {
  const { sessionStatus } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = Number(searchParams.get('careUserId'));

  // Catalogue (global)
  const [items, setItems] = useState<CommunicationItem[] | null>(null);
  const [categories, setCategories] = useState<CommunicationCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);
  const [catInfo, setCatInfo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');

  // Care users (for favourites view)
  const [careUsers, setCareUsers] = useState<CareUser[] | null>(null);
  const [cuLoading, setCuLoading] = useState(true);
  const [cuError, setCuError] = useState<string | null>(null);
  const [selectedCareUserId, setSelectedCareUserId] = useState<number | ''>('');
  const [favourites, setFavourites] = useState<FavouritePhrase[] | null>(null);
  const [favLoading, setFavLoading] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);

  // Item form
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<CommunicationItem | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [itemKey, setItemKey] = useState('');
  const [category, setCategory] = useState('general');
  const [labelEn, setLabelEn] = useState('');
  const [labelBn, setLabelBn] = useState('');
  const [iconKey, setIconKey] = useState('');
  const [speakTextEn, setSpeakTextEn] = useState('');
  const [speakTextBn, setSpeakTextBn] = useState('');
  const [sentenceRole, setSentenceRole] = useState<CommunicationItem['sentenceRole']>('other');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  const selectedCareUser = useMemo(() => (careUsers || []).find(u => u.id === selectedCareUserId) || null, [careUsers, selectedCareUserId]);

  const resetForm = () => {
    setItemKey(''); setCategory('general'); setLabelEn(''); setLabelBn(''); setIconKey('');
    setSpeakTextEn(''); setSpeakTextBn(''); setSentenceRole('other'); setSortOrder(0); setIsActive(true);
    setFormError(null); setFieldErrors({});
  };

  const loadCatalogue = useCallback(async () => {
    if (sessionStatus === 'offline_unverified') {
      setCatLoading(false); setCatError('Cannot load communication catalogue while session verification is pending. Please retry when connected.');
      return;
    }
    setCatLoading(true); setCatError(null);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        listCommunicationItems({ active: activeFilter }),
        getCommunicationCategories().catch(() => ({ data: { categories: [] as CommunicationCategory[] } })),
      ]);
      setItems(itemsRes.data.items || []);
      setCategories(catsRes.data.categories || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setCatError('Your session is no longer valid. Please sign in again.');
        else setCatError(e.message || 'Unable to load communication catalogue.');
      } else setCatError('Unable to load communication catalogue.');
      setItems(null);
    } finally { setCatLoading(false); }
  }, [sessionStatus, activeFilter]);

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

  const loadFavourites = useCallback(async (careUserId: number) => {
    if (sessionStatus === 'offline_unverified') { setFavError('Cannot load favourites while session verification is pending.'); setFavourites(null); return; }
    setFavLoading(true); setFavError(null);
    try {
      const res = await listFavourites(careUserId);
      setFavourites(res.data.favourites || []);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setFavError('Your session is no longer valid. Please sign in again.');
        else if (e.status === 403) setFavError('You are not authorized to view favourites for this care user.');
        else setFavError(e.message || 'Unable to load favourites.');
      } else setFavError('Unable to load favourites.');
      setFavourites(null);
    } finally { setFavLoading(false); }
  }, [sessionStatus]);

  useEffect(() => { loadCareUsers(); }, [loadCareUsers]);
  useEffect(() => { loadCatalogue(); }, [loadCatalogue]);
  useEffect(() => {
    if (typeof selectedCareUserId === 'number' && selectedCareUserId > 0) {
      loadFavourites(selectedCareUserId);
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('careUserId', String(selectedCareUserId)); return p; }, { replace: true });
    } else { setFavourites(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCareUserId]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items || []).filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return `${item.id} ${item.itemKey} ${item.category} ${item.labelEn} ${item.labelBn || ''} ${item.speakTextEn} ${item.speakTextBn || ''} ${item.iconKey || ''}`.toLowerCase().includes(q);
    });
  }, [items, search, categoryFilter]);

  const validateItem = (isEdit: boolean) => {
    const errs: Record<string, string> = {};
    if (!isEdit) {
      if (!itemKey.trim()) errs.itemKey = 'Item key is required.';
      else if (!/^[A-Z0-9_]+$/.test(itemKey.trim())) errs.itemKey = 'Item key must be uppercase letters, numbers, and underscores only.';
    }
    if (!labelEn.trim()) errs.labelEn = 'English label is required.';
    if (!speakTextEn.trim()) errs.speakTextEn = 'English speak text is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const startCreate = () => { resetForm(); setEditItem(null); setShowCreate(true); setCatInfo(null); };
  const startEdit = (item: CommunicationItem) => {
    setEditItem(item); setShowCreate(false); setCatInfo(null); setFormError(null); setFieldErrors({});
    setItemKey(item.itemKey); setCategory(item.category || 'general'); setLabelEn(item.labelEn || '');
    setLabelBn(item.labelBn || ''); setIconKey(item.iconKey || ''); setSpeakTextEn(item.speakTextEn || '');
    setSpeakTextBn(item.speakTextBn || ''); setSentenceRole(item.sentenceRole || 'other');
    setSortOrder(item.sortOrder || 0); setIsActive(!!item.isActive);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting) return;
    setFormError(null); setCatInfo(null);
    if (!validateItem(false)) return;
    const payload: CreateCommunicationItemPayload = {
      itemKey: itemKey.trim(),
      category: category.trim() || 'general',
      labelEn: labelEn.trim(),
      labelBn: labelBn.trim() || null,
      iconKey: iconKey.trim() || null,
      speakTextEn: speakTextEn.trim(),
      speakTextBn: speakTextBn.trim() || null,
      sentenceRole,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive,
    };
    setFormSubmitting(true);
    try {
      await createCommunicationItem(payload);
      setCatInfo('Communication item created successfully.');
      setShowCreate(false); resetForm();
      await loadCatalogue();
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to create communication item.');
      else setFormError('Unable to create communication item.');
    } finally { setFormSubmitting(false); }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting || !editItem) return;
    setFormError(null); setCatInfo(null);
    if (!validateItem(true)) return;
    const payload: UpdateCommunicationItemPayload = {
      category: category.trim() || 'general',
      labelEn: labelEn.trim(),
      labelBn: labelBn.trim() || null,
      iconKey: iconKey.trim() || null,
      speakTextEn: speakTextEn.trim(),
      speakTextBn: speakTextBn.trim() || null,
      sentenceRole,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive,
    };
    setFormSubmitting(true);
    try {
      await updateCommunicationItem(editItem.id, payload);
      setCatInfo('Communication item updated successfully.');
      setEditItem(null); resetForm();
      await loadCatalogue();
    } catch (e) {
      if (e instanceof ApiError) setFormError(getValidationMessages(e.details) || e.message || 'Unable to update communication item.');
      else setFormError('Unable to update communication item.');
    } finally { setFormSubmitting(false); }
  };

  const onDeactivate = async (item: CommunicationItem) => {
    if (formSubmitting) return;
    if (!window.confirm(`Deactivate communication item "${item.labelEn}" (${item.itemKey})? This sets it inactive (backend delete behavior).`)) return;
    setFormSubmitting(true); setCatError(null); setCatInfo(null);
    try {
      await deactivateCommunicationItem(item.id);
      setCatInfo('Communication item deactivated successfully.');
      if (editItem?.id === item.id) { setEditItem(null); resetForm(); }
      await loadCatalogue();
    } catch (e) {
      setCatError(e instanceof ApiError ? (e.message || 'Unable to deactivate item.') : 'Unable to deactivate item.');
    } finally { setFormSubmitting(false); }
  };

  const renderForm = (isEdit: boolean) => (
    <form onSubmit={isEdit ? submitEdit : submitCreate} noValidate className="form-grid">
      {formError ? <div className="alert alert-error" role="alert" style={{ gridColumn: '1 / -1' }}>{formError}</div> : null}
      {!isEdit ? (
        <div className="field">
          <label htmlFor="c-key">Item key *</label>
          <input id="c-key" value={itemKey} onChange={e => setItemKey(e.target.value.toUpperCase())} disabled={formSubmitting} placeholder="e.g. WANT_WATER" />
          {fieldErrors.itemKey ? <div className="field-error">{fieldErrors.itemKey}</div> : <div className="muted small">Stable uppercase key (letters/numbers/underscores). Cannot be changed after create.</div>}
        </div>
      ) : (
        <div className="field"><label>Item key</label><input value={editItem?.itemKey || ''} disabled readOnly /></div>
      )}
      <div className="field"><label htmlFor="c-cat">Category</label><input id="c-cat" value={category} onChange={e => setCategory(e.target.value)} disabled={formSubmitting} /></div>
      <div className="field"><label htmlFor="c-labelEn">Label (English) *</label><input id="c-labelEn" value={labelEn} onChange={e => setLabelEn(e.target.value)} disabled={formSubmitting} />{fieldErrors.labelEn ? <div className="field-error">{fieldErrors.labelEn}</div> : null}</div>
      <div className="field"><label htmlFor="c-labelBn">Label (Bengali)</label><input id="c-labelBn" value={labelBn} onChange={e => setLabelBn(e.target.value)} disabled={formSubmitting} placeholder="বাংলা লেবেল (if available)" /></div>
      <div className="field"><label htmlFor="c-speakEn">Speak text (English) *</label><input id="c-speakEn" value={speakTextEn} onChange={e => setSpeakTextEn(e.target.value)} disabled={formSubmitting} />{fieldErrors.speakTextEn ? <div className="field-error">{fieldErrors.speakTextEn}</div> : null}</div>
      <div className="field"><label htmlFor="c-speakBn">Speak text (Bengali)</label><input id="c-speakBn" value={speakTextBn} onChange={e => setSpeakTextBn(e.target.value)} disabled={formSubmitting} placeholder="বাংলা উচ্চারণ টেক্সট (if available)" /></div>
      <div className="field"><label htmlFor="c-icon">Icon key</label><input id="c-icon" value={iconKey} onChange={e => setIconKey(e.target.value)} disabled={formSubmitting} placeholder="asset/reference key" /></div>
      <div className="field"><label htmlFor="c-role">Sentence role</label><select id="c-role" value={sentenceRole} onChange={e => setSentenceRole(e.target.value as any)} disabled={formSubmitting}>{SENTENCE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
      <div className="field"><label htmlFor="c-sort">Sort order</label><input id="c-sort" type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} disabled={formSubmitting} /></div>
      <div className="field"><label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} disabled={formSubmitting} /> Active</label></div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={formSubmitting}>{formSubmitting ? 'Saving…' : (isEdit ? 'Save changes' : 'Create item')}</button>
        <button type="button" className="btn btn-outline" onClick={() => { setShowCreate(false); setEditItem(null); resetForm(); }} disabled={formSubmitting}>Cancel</button>
      </div>
    </form>
  );

  return (
    <div className="page">
      {catInfo ? <div className="alert alert-success" role="status">{catInfo}</div> : null}

      <section className="card">
        <div className="card-header-row">
          <div>
            <h2>Communication catalogue (global)</h2>
            <p className="muted">Global communication items used by the mobile TALK module (backend/MySQL). Catalogue create/update/deactivate are supported for caregivers via existing APIs. Bilingual fields (EN/BN) are displayed and preserved as stored — no fabricated translations.</p>
          </div>
          <div className="row-actions">
            <button className="btn btn-outline" onClick={loadCatalogue} disabled={catLoading}>Refresh catalogue</button>
            <button className="btn btn-primary" onClick={startCreate} disabled={formSubmitting}>{showCreate ? 'Close form' : 'Add item'}</button>
          </div>
        </div>

        <div className="filters" style={{ marginTop: 8 }}>
          <label className="filter-item"><span>Search (fetched)</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Key, label, speak text, category…" /></label>
          <label className="filter-item"><span>Category</span>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map(c => <option key={c.category} value={c.category}>{c.category} ({c.itemCount})</option>)}
            </select>
          </label>
          <label className="filter-item"><span>Active filter (API)</span>
            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as any)}>
              <option value="all">All</option><option value="true">Active only</option><option value="false">Inactive only</option>
            </select>
          </label>
          <div className="muted small" style={{ alignSelf: 'end' }}>Showing {filteredItems.length} of {(items || []).length} fetched item(s). Summary counts from real fetched data only.</div>
        </div>
      </section>

      {(showCreate || editItem) ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>{editItem ? `Edit item: ${editItem.itemKey}` : 'Create communication item'}</h3>
          <p className="muted">Only fields supported by the backend are submitted. English fields are required by backend validation; Bengali fields are preserved as provided (not auto-translated).</p>
          {renderForm(!!editItem)}
        </section>
      ) : null}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Catalogue items</h3>
        {catLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading communication items…</div>
        : catError ? <div><div className="alert alert-error" role="alert">{catError}</div><button className="btn btn-primary btn-sm" onClick={loadCatalogue}>Retry</button></div>
        : items && items.length === 0 ? <div className="empty-state"><p><strong>No communication items found.</strong></p><p className="muted">The server returned an empty global catalogue. No items are fabricated.</p></div>
        : filteredItems.length === 0 ? <div className="empty-state"><p>No items match the current search/filter (applied over fetched data).</p></div>
        : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Key / ID</th><th>Category / Role</th><th>English</th><th>Bengali</th><th>Icon/Order</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td><div className="cu-name">{item.itemKey}</div><div className="muted small">ID: {item.id}</div></td>
                    <td><div>{item.category}</div><div className="muted small">{item.sentenceRole}</div></td>
                    <td><div><strong>{item.labelEn}</strong></div><div className="muted small">Speak: {item.speakTextEn}</div></td>
                    <td><div>{item.labelBn || <span className="muted">— (not provided)</span>}</div><div className="muted small">Speak: {item.speakTextBn || '—'}</div></td>
                    <td><div className="muted small">icon: {item.iconKey || '—'}</div><div className="muted small">sort: {item.sortOrder}</div></td>
                    <td><span className={`status-badge ${item.isActive ? 'ok' : 'muted-b'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => startEdit(item)} disabled={formSubmitting}>Edit</button>
                        {item.isActive ? <button className="btn btn-outline btn-sm" onClick={() => onDeactivate(item)} disabled={formSubmitting}>Deactivate</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header-row">
          <div>
            <h2>Favourites (care-user specific, read-only for caregiver)</h2>
            <p className="muted">Favourites are owned by care users and managed by the care user in the mobile TALK module (backend enforces). Existing caregiver-accessible API supports <strong>viewing/listing</strong> favourites for a linked care user only. Add/remove operations are not available to caregivers in the current backend contract and are not exposed here.</p>
          </div>
          <div className="row-actions">
            <button className="btn btn-outline" onClick={loadCareUsers} disabled={cuLoading}>Refresh care users</button>
            {typeof selectedCareUserId === 'number' ? <button className="btn btn-outline" onClick={() => loadFavourites(selectedCareUserId)} disabled={favLoading}>Refresh favourites</button> : null}
          </div>
        </div>

        {cuLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading linked care users…</div>
        : cuError ? <div><div className="alert alert-error" role="alert">{cuError}</div><button className="btn btn-primary btn-sm" onClick={loadCareUsers}>Retry</button></div>
        : !careUsers || careUsers.length === 0 ? <div className="empty-state"><p><strong>No linked care users found.</strong></p><p className="muted">Cannot view care-user favourites without a linked care user. No data fabricated.</p></div>
        : (
          <div className="filters" style={{ marginTop: 8 }}>
            <label className="filter-item" style={{ maxWidth: 520 }}><span>Care user</span>
              <select value={selectedCareUserId} onChange={e => setSelectedCareUserId(e.target.value ? Number(e.target.value) : '')} aria-label="Select care user for favourites">
                <option value="" disabled>Select a care user…</option>
                {careUsers.map(u => <option key={u.id} value={u.id}>{careUserLabel(u)}</option>)}
              </select>
            </label>
            {selectedCareUser ? <div className="muted small" style={{ alignSelf: 'end' }}>Viewing favourites for <strong>{careUserLabel(selectedCareUser)}</strong> (real backend data only).</div> : null}
          </div>
        )}
      </section>

      {typeof selectedCareUserId === 'number' ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Favourite phrases</h3>
          {favLoading ? <div className="inline-loading" role="status"><span className="spinner sm" aria-hidden="true" /> Loading favourites…</div>
          : favError ? <div><div className="alert alert-error" role="alert">{favError}</div><button className="btn btn-primary btn-sm" onClick={() => loadFavourites(selectedCareUserId)}>Retry</button></div>
          : favourites && favourites.length === 0 ? <div className="empty-state"><p><strong>No favourites found.</strong></p><p className="muted">No favourite phrases returned for this care user. Care users can add favourites from the mobile TALK module.</p></div>
          : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>ID / Label</th><th>English phrase</th><th>Bengali phrase</th><th>Item ref / Keys</th><th>Status</th></tr></thead>
                <tbody>
                  {favourites!.map(f => (
                    <tr key={f.id}>
                      <td><div className="cu-name">#{f.id}</div><div className="muted small">{f.phraseLabel || '—'}</div></td>
                      <td>{f.phraseEn || <span className="muted">—</span>}</td>
                      <td>{f.phraseBn || <span className="muted">— (not provided)</span>}</td>
                      <td><div className="muted small">Item: {f.communicationItemId ?? '—'}</div><div className="muted small">Keys: {Array.isArray(f.selectedItemKeys) && f.selectedItemKeys.length ? f.selectedItemKeys.join(', ') : '—'}</div></td>
                      <td><span className={`status-badge ${f.isActive ? 'ok' : 'muted-b'}`}>{f.isActive ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">Showing {favourites!.length} genuine favourite record(s). Add/remove is managed by the care user in mobile (not available to caregiver via current API).</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
