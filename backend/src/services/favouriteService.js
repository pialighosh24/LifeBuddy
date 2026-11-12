const { pool } = require('../config/db');

function httpError(statusCode, message, code, errors) {
  const err = new Error(message);
  err.statusCode = statusCode; err.code = code; if (errors) err.errors = errors; return err;
}

async function ensureAccess(requester, careUserId, { manage = false } = {}) {
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(careUserId)) throw httpError(403, 'Forbidden: cannot access another user\'s favourites', 'FORBIDDEN');
    return;
  }
  if (requester.role === 'caregiver') {
    const [rows] = await pool.execute(
      `SELECT 1 FROM caregiver_links WHERE caregiver_id = ? AND care_user_id = ? AND link_status = 'active' LIMIT 1`,
      [requester.id, careUserId]
    );
    if (!rows.length) throw httpError(403, 'Forbidden: caregiver not linked to this user', 'FORBIDDEN');
    if (manage) throw httpError(403, 'Forbidden: caregivers cannot modify favourites', 'FORBIDDEN');
    return;
  }
  throw httpError(403, 'Forbidden', 'FORBIDDEN');
}

function mapFavourite(row) {
  if (!row) return null;
  let selectedItemKeys = row.selected_item_keys;
  if (typeof selectedItemKeys === 'string') {
    try { selectedItemKeys = JSON.parse(selectedItemKeys); } catch (_) {}
  }
  return {
    id: row.id,
    careUserId: row.care_user_id,
    communicationItemId: row.communication_item_id,
    selectedItemKeys,
    phraseEn: row.phrase_en,
    phraseBn: row.phrase_bn,
    phraseLabel: row.phrase_label,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function addFavourite(requester, careUserId, data) {
  await ensureAccess(requester, careUserId, { manage: true });

  let communicationItemId = data.communicationItemId ?? null;
  let phraseEn = data.phraseEn ?? null;
  let phraseBn = data.phraseBn ?? null;

  if (communicationItemId) {
    const [items] = await pool.execute('SELECT id, label_en, label_bn, speak_text_en, speak_text_bn, is_active FROM communication_items WHERE id = ? LIMIT 1', [communicationItemId]);
    if (!items.length) throw httpError(400, 'Referenced communication item does not exist', 'VALIDATION_ERROR');
    if (!items[0].is_active) throw httpError(400, 'Referenced communication item is not active', 'VALIDATION_ERROR');
    if (!phraseEn) phraseEn = items[0].speak_text_en || items[0].label_en;
    if (!phraseBn) phraseBn = items[0].speak_text_bn || items[0].label_bn || null;
  }

  if (!phraseEn || !String(phraseEn).trim()) {
    throw httpError(400, 'phraseEn is required when not derivable from a valid communication item', 'VALIDATION_ERROR');
  }

  // Prevent duplicates (no unique constraint): same care_user + same communication_item_id OR same phrase text
  if (communicationItemId) {
    const [dup] = await pool.execute('SELECT id FROM favourite_phrases WHERE care_user_id = ? AND communication_item_id = ? AND is_active = 1 LIMIT 1', [careUserId, communicationItemId]);
    if (dup.length) throw httpError(409, 'Favourite already exists for this communication item', 'CONFLICT');
  } else {
    const [dup] = await pool.execute('SELECT id FROM favourite_phrases WHERE care_user_id = ? AND communication_item_id IS NULL AND phrase_en = ? AND is_active = 1 LIMIT 1', [careUserId, phraseEn]);
    if (dup.length) throw httpError(409, 'Favourite phrase already exists', 'CONFLICT');
  }

  const selectedItemKeys = data.selectedItemKeys ? JSON.stringify(data.selectedItemKeys) : null;
  const [res] = await pool.execute(
    `INSERT INTO favourite_phrases (care_user_id, communication_item_id, selected_item_keys, phrase_en, phrase_bn, phrase_label, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [careUserId, communicationItemId, selectedItemKeys, phraseEn, phraseBn ?? null, data.phraseLabel ?? null]
  );
  const [rows] = await pool.execute('SELECT * FROM favourite_phrases WHERE id = ?', [res.insertId]);
  return { favourite: mapFavourite(rows[0]) };
}

async function listFavourites(requester, careUserId) {
  await ensureAccess(requester, careUserId, { manage: false });
  const [rows] = await pool.execute(
    'SELECT * FROM favourite_phrases WHERE care_user_id = ? AND is_active = 1 ORDER BY created_at DESC, id DESC',
    [careUserId]
  );
  return { favourites: rows.map(mapFavourite) };
}

async function removeFavourite(requester, favouriteId) {
  const [rows] = await pool.execute('SELECT * FROM favourite_phrases WHERE id = ? LIMIT 1', [favouriteId]);
  if (!rows.length) throw httpError(404, 'Favourite not found', 'NOT_FOUND');
  const fav = rows[0];
  await ensureAccess(requester, fav.care_user_id, { manage: true });
  await pool.execute('DELETE FROM favourite_phrases WHERE id = ?', [favouriteId]);
  return { deletedFavouriteId: Number(favouriteId) };
}

module.exports = { addFavourite, listFavourites, removeFavourite };
