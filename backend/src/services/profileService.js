const { pool } = require('../config/db');

function httpError(statusCode, message, code, errors) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (errors) err.errors = errors;
  return err;
}

function sanitizeUserProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    email: row.email,
    fullName: row.full_name,
    displayName: row.display_name,
    status: row.status,
    preferredLanguage: row.preferred_language,
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPreferences(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    textSize: row.text_size,
    contrastMode: row.contrast_mode,
    speechRate: row.speech_rate !== null && row.speech_rate !== undefined ? Number(row.speech_rate) : null,
    voiceEnabled: !!row.voice_enabled,
    reducedMotion: !!row.reduced_motion,
    notificationsEnabled: !!row.notifications_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAuthenticatedProfile(userId) {
  const [rows] = await pool.execute(
    `SELECT id, role, email, full_name, display_name, status, preferred_language, phone_number, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) throw httpError(404, 'User not found', 'NOT_FOUND');
  return { profile: sanitizeUserProfile(rows[0]) };
}

async function updateAuthenticatedProfile(userId, updates) {
  const allowed = {
    fullName: 'full_name',
    displayName: 'display_name',
    preferredLanguage: 'preferred_language',
    phoneNumber: 'phone_number',
  };
  const sets = [];
  const values = [];
  for (const [key, col] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${col} = ?`);
      const val = updates[key];
      values.push(val === '' ? null : val);
    }
  }
  if (!sets.length) throw httpError(400, 'No permitted fields provided for update', 'VALIDATION_ERROR');
  values.push(userId);
  await pool.execute(
    `UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [values, userId].flat ? values.concat([userId]) : [...values] // safety; values already has userId pushed above
  );
  // above has small duplication risk in construction; do cleanly
  return getAuthenticatedProfile(userId);
}

async function updateAuthenticatedProfileClean(userId, updates) {
  const allowed = {
    fullName: 'full_name',
    displayName: 'display_name',
    preferredLanguage: 'preferred_language',
    phoneNumber: 'phone_number',
  };
  const sets = [];
  const values = [];
  for (const [key, col] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${col} = ?`);
      const val = updates[key];
      values.push(val === '' ? null : val);
    }
  }
  if (!sets.length) throw httpError(400, 'No permitted fields provided for update', 'VALIDATION_ERROR');
  await pool.execute(
    `UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...values, userId]
  );
  return getAuthenticatedProfile(userId);
}

async function ensureUserExists(userId) {
  const [rows] = await pool.execute('SELECT id, role, status FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!rows.length) throw httpError(404, 'User not found', 'NOT_FOUND');
  return rows[0];
}

async function ensureCaregiverAccessToCareUser(caregiverId, careUserId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.role, u.status
     FROM caregiver_links cl
     JOIN users u ON u.id = cl.care_user_id
     WHERE cl.caregiver_id = ? AND cl.care_user_id = ? AND cl.link_status = 'active'
     LIMIT 1`,
    [caregiverId, careUserId]
  );
  if (!rows.length) throw httpError(403, 'Forbidden: caregiver not linked to this user', 'FORBIDDEN');
  if (rows[0].role !== 'user') throw httpError(403, 'Target account is not a care-user', 'FORBIDDEN');
  return rows[0];
}

async function ensurePreferencesAccess(requester, targetUserId) {
  await ensureUserExists(targetUserId);
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(targetUserId)) {
      throw httpError(403, 'Forbidden: cannot access another user\'s preferences', 'FORBIDDEN');
    }
    return;
  }
  if (requester.role === 'caregiver') {
    await ensureCaregiverAccessToCareUser(requester.id, targetUserId);
    return;
  }
  throw httpError(403, 'Forbidden', 'FORBIDDEN');
}

async function getOrCreatePreferences(targetUserId) {
  const [rows] = await pool.execute('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1', [targetUserId]);
  if (rows.length) return mapPreferences(rows[0]);

  const user = await ensureUserExists(targetUserId);
  // Create defaults aligned with schema defaults
  await pool.execute(
    `INSERT INTO user_preferences (user_id, language, text_size, contrast_mode, speech_rate, voice_enabled, reduced_motion, notifications_enabled)
     VALUES (?, ?, 'large', 'high', 1.00, 1, 0, 1)`,
    [targetUserId, user.role === 'user' ? 'en' : 'en']
  );
  const [created] = await pool.execute('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1', [targetUserId]);
  if (!created.length) throw httpError(500, 'Failed to create default preferences', 'INTERNAL_ERROR');
  return mapPreferences(created[0]);
}

async function getPreferences(requester, targetUserId) {
  await ensurePreferencesAccess(requester, targetUserId);
  const preferences = await getOrCreatePreferences(targetUserId);
  return { preferences };
}

async function updatePreferences(requester, targetUserId, updates) {
  await ensurePreferencesAccess(requester, targetUserId);
  // Ensure row exists (defaults) before update
  await getOrCreatePreferences(targetUserId);

  const fieldMap = {
    language: 'language',
    textSize: 'text_size',
    contrastMode: 'contrast_mode',
    speechRate: 'speech_rate',
    voiceEnabled: 'voice_enabled',
    reducedMotion: 'reduced_motion',
    notificationsEnabled: 'notifications_enabled',
  };
  const sets = [];
  const values = [];
  for (const [key, col] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${col} = ?`);
      let val = updates[key];
      if (typeof val === 'boolean') val = val ? 1 : 0;
      values.push(val);
    }
  }
  if (!sets.length) throw httpError(400, 'No permitted preference fields provided for update', 'VALIDATION_ERROR');

  await pool.execute(
    `UPDATE user_preferences SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
    [...values, targetUserId]
  );
  const [rows] = await pool.execute('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1', [targetUserId]);
  return { preferences: mapPreferences(rows[0]) };
}

module.exports = {
  getAuthenticatedProfile,
  updateAuthenticatedProfile: updateAuthenticatedProfileClean,
  getPreferences,
  updatePreferences,
};
