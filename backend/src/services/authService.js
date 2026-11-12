const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const config = require('../config/env');
const { signToken } = require('../utils/jwt');

function httpError(statusCode, message, code, errors) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (errors) err.errors = errors;
  return err;
}

async function registerCaregiver({ email, password, fullName, displayName, preferredLanguage, phoneNumber }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
  if (existing.length) throw httpError(409, 'Email already registered', 'CONFLICT');
  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      `INSERT INTO users (role, email, password_hash, pin_hash, full_name, display_name, status, preferred_language, phone_number)
       VALUES ('caregiver', ?, ?, NULL, ?, ?, 'active', ?, ?)`,
      [normalizedEmail, passwordHash, fullName, displayName || null, preferredLanguage || 'en', phoneNumber || null]
    );
    await conn.commit();
    const user = { id: result.insertId, role: 'caregiver', email: normalizedEmail, fullName, displayName: displayName || null, preferredLanguage: preferredLanguage || 'en' };
    const token = signToken({ sub: user.id, role: user.role });
    return { token, user };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function loginCaregiver({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const [rows] = await pool.execute(
    'SELECT id, role, email, password_hash, full_name, display_name, status, preferred_language FROM users WHERE email = ? AND role = "caregiver" LIMIT 1',
    [normalizedEmail]
  );
  // Generic error to avoid leaking account existence/status
  const invalid = () => httpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (!rows.length) throw invalid();
  const userRow = rows[0];
  if (userRow.status !== 'active') throw invalid();
  const ok = await bcrypt.compare(password, userRow.password_hash || '');
  if (!ok) throw invalid();
  const user = {
    id: userRow.id,
    role: userRow.role,
    email: userRow.email,
    fullName: userRow.full_name,
    displayName: userRow.display_name,
    preferredLanguage: userRow.preferred_language,
  };
  const token = signToken({ sub: user.id, role: user.role });
  return { token, user };
}

async function setupUserPin({ caregiverId, careUserId, pin, fullName, displayName, preferredLanguage }) {
  // Verify active link
  const [links] = await pool.execute(
    'SELECT id FROM caregiver_links WHERE caregiver_id = ? AND care_user_id = ? AND link_status = "active" LIMIT 1',
    [caregiverId, careUserId]
  );
  if (!links.length) throw httpError(403, 'Caregiver not linked to this user', 'FORBIDDEN');

  const [users] = await pool.execute('SELECT id, role, status FROM users WHERE id = ? LIMIT 1', [careUserId]);
  if (!users.length || users[0].role !== 'user') throw httpError(404, 'Care user not found', 'NOT_FOUND');
  if (users[0].status !== 'active') throw httpError(403, 'Care user is inactive', 'FORBIDDEN');

  const pinHash = await bcrypt.hash(pin, config.bcryptSaltRounds);
  const fields = ['pin_hash = ?'];
  const values = [pinHash];
  if (fullName !== undefined) { fields.push('full_name = ?'); values.push(fullName); }
  if (displayName !== undefined) { fields.push('display_name = ?'); values.push(displayName); }
  if (preferredLanguage !== undefined) { fields.push('preferred_language = ?'); values.push(preferredLanguage); }
  values.push(careUserId);
  await pool.execute(`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'user'`, values);

  const [out] = await pool.execute(
    'SELECT id, role, full_name, display_name, status, preferred_language FROM users WHERE id = ? LIMIT 1',
    [careUserId]
  );
  return {
    id: out[0].id,
    role: out[0].role,
    fullName: out[0].full_name,
    displayName: out[0].display_name,
    preferredLanguage: out[0].preferred_language,
  };
}

async function loginUserWithPin({ careUserId, pin }) {
  const [rows] = await pool.execute(
    'SELECT id, role, pin_hash, full_name, display_name, status, preferred_language FROM users WHERE id = ? AND role = "user" LIMIT 1',
    [careUserId]
  );
  // Generic error to avoid leaking account existence/status details
  const invalid = () => httpError(401, 'Invalid user or PIN', 'INVALID_CREDENTIALS');
  if (!rows.length) throw invalid();
  const userRow = rows[0];
  if (userRow.status !== 'active' || !userRow.pin_hash) throw invalid();
  const ok = await bcrypt.compare(pin, userRow.pin_hash);
  if (!ok) throw invalid();
  const user = {
    id: userRow.id,
    role: userRow.role,
    fullName: userRow.full_name,
    displayName: userRow.display_name,
    preferredLanguage: userRow.preferred_language,
  };
  const token = signToken({ sub: user.id, role: user.role });
  return { token, user };
}

module.exports = { registerCaregiver, loginCaregiver, setupUserPin, loginUserWithPin };
