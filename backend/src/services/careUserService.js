const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const config = require('../config/env');

function httpError(statusCode, message, code, errors) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (errors) err.errors = errors;
  return err;
}

function sanitizeUser(row) {
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

async function ensureCaregiverLinkedToUser(caregiverId, careUserId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.role, u.email, u.full_name, u.display_name, u.status, u.preferred_language, u.phone_number, u.created_at, u.updated_at
     FROM caregiver_links cl
     JOIN users u ON u.id = cl.care_user_id
     WHERE cl.caregiver_id = ? AND cl.care_user_id = ? AND cl.link_status = 'active'
     LIMIT 1`,
    [caregiverId, careUserId]
  );
  if (!rows.length) throw httpError(403, 'Forbidden: caregiver not linked to this user', 'FORBIDDEN');
  if (rows[0].role !== 'user') throw httpError(403, 'Linked account is not a care-user', 'FORBIDDEN');
  return rows[0];
}

async function createCareUser({ caregiverId, fullName, displayName, preferredLanguage, phoneNumber, relationshipType }) {
  // Verify caregiver exists and has correct role
  const [caregivers] = await pool.execute(
    'SELECT id, role, status FROM users WHERE id = ? LIMIT 1',
    [caregiverId]
  );
  if (!caregivers.length || caregivers[0].role !== 'caregiver' || caregivers[0].status !== 'active') {
    throw httpError(403, 'Invalid caregiver account', 'FORBIDDEN');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [userResult] = await conn.execute(
      `INSERT INTO users (role, email, password_hash, pin_hash, full_name, display_name, status, preferred_language, phone_number)
       VALUES ('user', NULL, NULL, NULL, ?, ?, 'active', ?, ?)`,
      [fullName, displayName || null, preferredLanguage || 'en', phoneNumber || null]
    );
    const careUserId = userResult.insertId;

    // Enforce invariant (DB CHECK removed for MySQL 8 compatibility)
    if (Number(caregiverId) === Number(careUserId)) {
      throw httpError(400, 'Caregiver cannot be linked as their own care-user', 'INVALID_LINK');
    }

    // Ensure duplicate-safe link creation (unique constraint on pair)
    await conn.execute(
      `INSERT INTO caregiver_links (caregiver_id, care_user_id, relationship_type, link_status, linked_by)
       VALUES (?, ?, ?, 'active', ?)`,
      [caregiverId, careUserId, relationshipType || null, caregiverId]
    );

    const [rows] = await conn.execute(
      `SELECT id, role, email, full_name, display_name, status, preferred_language, phone_number, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
      [careUserId]
    );
    await conn.commit();
    return { careUser: sanitizeUser(rows[0]) };
  } catch (e) {
    await conn.rollback();
    if (e && e.code === 'ER_DUP_ENTRY') {
      throw httpError(409, 'Care-user link already exists', 'CONFLICT');
    }
    throw e;
  } finally {
    conn.release();
  }
}

async function listLinkedCareUsers(caregiverId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.role, u.email, u.full_name, u.display_name, u.status, u.preferred_language, u.phone_number, u.created_at, u.updated_at,
            cl.relationship_type, cl.link_status, cl.created_at AS linked_at
     FROM caregiver_links cl
     JOIN users u ON u.id = cl.care_user_id
     WHERE cl.caregiver_id = ? AND cl.link_status = 'active'
     ORDER BY u.created_at DESC, u.id DESC`,
    [caregiverId]
  );
  return rows.map(r => ({
    ...sanitizeUser(r),
    link: { relationshipType: r.relationship_type, linkStatus: r.link_status, linkedAt: r.linked_at },
  }));
}

async function getLinkedCareUser(caregiverId, careUserId) {
  const row = await ensureCaregiverLinkedToUser(caregiverId, careUserId);
  const [links] = await pool.execute(
    'SELECT relationship_type, link_status, created_at FROM caregiver_links WHERE caregiver_id = ? AND care_user_id = ? LIMIT 1',
    [caregiverId, careUserId]
  );
  return {
    careUser: {
      ...sanitizeUser(row),
      link: links.length ? { relationshipType: links[0].relationship_type, linkStatus: links[0].link_status, linkedAt: links[0].created_at } : null,
    },
  };
}

async function updateLinkedCareUser(caregiverId, careUserId, updates) {
  await ensureCaregiverLinkedToUser(caregiverId, careUserId);

  const allowed = {
    fullName: 'full_name',
    displayName: 'display_name',
    preferredLanguage: 'preferred_language',
    phoneNumber: 'phone_number',
    status: 'status',
  };
  const sets = [];
  const values = [];
  for (const [key, col] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${col} = ?`);
      values.push(updates[key] === '' ? null : updates[key]);
    }
  }
  if (!sets.length) throw httpError(400, 'No permitted fields provided for update', 'VALIDATION_ERROR');

  values.push(careUserId);
  await pool.execute(
    `UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'user'`,
    values
  );
  const row = await ensureCaregiverLinkedToUser(caregiverId, careUserId);
  return { careUser: sanitizeUser(row) };
}

async function setCareUserPin({ caregiverId, careUserId, pin, fullName, displayName, preferredLanguage }) {
  // Ownership/link + role/status verified
  await ensureCaregiverLinkedToUser(caregiverId, careUserId);

  const pinHash = await bcrypt.hash(pin, config.bcryptSaltRounds);
  const fields = ['pin_hash = ?'];
  const values = [pinHash];
  if (fullName !== undefined) { fields.push('full_name = ?'); values.push(fullName); }
  if (displayName !== undefined) { fields.push('display_name = ?'); values.push(displayName); }
  if (preferredLanguage !== undefined) { fields.push('preferred_language = ?'); values.push(preferredLanguage); }
  values.push(careUserId);
  await pool.execute(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'user'`,
    values
  );
  const row = await ensureCaregiverLinkedToUser(caregiverId, careUserId);
  return { careUser: sanitizeUser(row) };
}

module.exports = {
  createCareUser,
  listLinkedCareUsers,
  getLinkedCareUser,
  updateLinkedCareUser,
  setCareUserPin,
};
