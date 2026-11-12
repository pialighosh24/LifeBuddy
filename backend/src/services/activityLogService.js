const { pool } = require('../config/db');

function httpError(statusCode, message, code) {
  const err = new Error(message);
  err.statusCode = statusCode; err.code = code; return err;
}

function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return meta ?? null;
  const blocked = new Set(['password', 'pin', 'pinHash', 'password_hash', 'token', 'jwt', 'authorization', 'secret', 'expo_push_token']);
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (blocked.has(k) || /password|pin|token|secret/i.test(k)) continue;
    out[k] = v;
  }
  return out;
}

async function logEvent({ actorUserId = null, careUserId = null, eventType, entityType = null, entityId = null, summary, metadata = null }, { strict = false } = {}) {
  try {
    const safeMeta = sanitizeMetadata(metadata);
    await pool.execute(
      `INSERT INTO activity_logs (actor_user_id, care_user_id, event_type, entity_type, entity_id, summary, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        actorUserId || null,
        careUserId || null,
        String(eventType).slice(0, 80),
        entityType ? String(entityType).slice(0, 50) : null,
        entityId || null,
        String(summary || eventType).slice(0, 255),
        safeMeta ? JSON.stringify(safeMeta) : null,
      ]
    );
    return { logged: true };
  } catch (e) {
    if (strict) throw e;
    return { logged: false, error: e && e.code ? e.code : 'LOG_FAILED' };
  }
}

function mapLog(row) {
  if (!row) return null;
  let meta = row.metadata_json;
  if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch (_) {} }
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    careUserId: row.care_user_id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    metadata: meta,
    createdAt: row.created_at,
  };
}

async function ensureCareUserAccess(requester, careUserId) {
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(careUserId)) throw httpError(403, 'Forbidden: cannot access another user\'s activity', 'FORBIDDEN');
    return;
  }
  if (requester.role === 'caregiver') {
    const [rows] = await pool.execute(
      `SELECT 1 FROM caregiver_links WHERE caregiver_id = ? AND care_user_id = ? AND link_status = 'active' LIMIT 1`,
      [requester.id, careUserId]
    );
    if (!rows.length) throw httpError(403, 'Forbidden: caregiver not linked to this user', 'FORBIDDEN');
    return;
  }
  throw httpError(403, 'Forbidden', 'FORBIDDEN');
}

async function listForCareUser(requester, careUserId, { limit = 100 } = {}) {
  await ensureCareUserAccess(requester, careUserId);
  const lim = Math.max(1, Math.min(Number(limit) || 100, 200));
  const [rows] = await pool.execute(
    `SELECT * FROM activity_logs WHERE care_user_id = ? ORDER BY created_at DESC, id DESC LIMIT ${lim}`,
    [careUserId]
  );
  return { activities: rows.map(mapLog) };
}

async function listForMe(requester, { limit = 100 } = {}) {
  const lim = Math.max(1, Math.min(Number(limit) || 100, 200));
  const [rows] = await pool.execute(
    `SELECT * FROM activity_logs WHERE actor_user_id = ? ORDER BY created_at DESC, id DESC LIMIT ${lim}`,
    [requester.id]
  );
  return { activities: rows.map(mapLog) };
}

module.exports = { logEvent, listForCareUser, listForMe };
