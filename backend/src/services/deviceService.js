const { pool } = require('../config/db');

function httpError(statusCode, message, code) {
  const err = new Error(message);
  err.statusCode = statusCode; err.code = code; return err;
}

function maskToken(token) {
  if (!token || token.length < 12) return '***';
  return `${token.slice(0, 10)}...${token.slice(-6)}`;
}

function mapDevice(row, { includeFull = false } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    expoPushToken: includeFull ? row.expo_push_token : maskToken(row.expo_push_token),
    tokenMasked: maskToken(row.expo_push_token),
    isActive: !!row.is_active,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function registerDevice(userId, { expoPushToken, platform }) {
  const token = String(expoPushToken).trim();
  const plat = platform || 'android';
  // If token exists (unique), update ownership/active/platform/last_seen safely (rotation/re-registration)
  const [existing] = await pool.execute('SELECT * FROM device_tokens WHERE expo_push_token = ? LIMIT 1', [token]);
  if (existing.length) {
    const row = existing[0];
    if (Number(row.user_id) !== Number(userId)) {
      // Do not allow claiming another user's token
      throw httpError(403, 'Device token is already registered to another user', 'FORBIDDEN');
    }
    await pool.execute(
      `UPDATE device_tokens SET platform = ?, is_active = 1, last_seen_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [plat, row.id]
    );
    const [rows] = await pool.execute('SELECT * FROM device_tokens WHERE id = ?', [row.id]);
    return { device: mapDevice(rows[0]), registered: true, rotated: false };
  }

  const [res] = await pool.execute(
    `INSERT INTO device_tokens (user_id, platform, expo_push_token, is_active, last_seen_at)
     VALUES (?, ?, ?, 1, NOW())`,
    [userId, plat, token]
  );
  const [rows] = await pool.execute('SELECT * FROM device_tokens WHERE id = ?', [res.insertId]);
  return { device: mapDevice(rows[0]), registered: true };
}

async function listDevices(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM device_tokens WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC, id DESC',
    [userId]
  );
  return { devices: rows.map(r => mapDevice(r)) };
}

async function unregisterDevice(userId, deviceId) {
  const [rows] = await pool.execute('SELECT * FROM device_tokens WHERE id = ? LIMIT 1', [deviceId]);
  if (!rows.length) throw httpError(404, 'Device not found', 'NOT_FOUND');
  if (Number(rows[0].user_id) !== Number(userId)) throw httpError(403, 'Forbidden: cannot unregister another user\'s device', 'FORBIDDEN');
  await pool.execute('UPDATE device_tokens SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [deviceId]);
  const [updated] = await pool.execute('SELECT * FROM device_tokens WHERE id = ?', [deviceId]);
  return { device: mapDevice(updated[0]) };
}

module.exports = { registerDevice, listDevices, unregisterDevice };
