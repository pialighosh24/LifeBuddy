const { pool } = require('../config/db');

function httpError(statusCode, message, code, errors) {
  const err = new Error(message);
  err.statusCode = statusCode; err.code = code; if (errors) err.errors = errors; return err;
}

async function ensureActiveCaregiverLink(caregiverId, careUserId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.role FROM caregiver_links cl JOIN users u ON u.id = cl.care_user_id
     WHERE cl.caregiver_id = ? AND cl.care_user_id = ? AND cl.link_status = 'active' LIMIT 1`,
    [caregiverId, careUserId]
  );
  if (!rows.length) throw httpError(403, 'Forbidden: caregiver not linked to this user', 'FORBIDDEN');
  return rows[0];
}

function mapAlert(row) {
  if (!row) return null;
  return {
    id: row.id,
    careUserId: row.care_user_id,
    emergencyContactId: row.emergency_contact_id,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    locationStatus: row.location_status,
    alertStatus: row.alert_status,
    deliveryStatus: row.delivery_status,
    deliveryChannel: row.delivery_channel,
    deliveryMessage: row.delivery_message,
    failureReason: row.failure_reason,
    triggeredAt: row.triggered_at,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedBy: row.acknowledged_by,
    clientEventId: row.client_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createSosAlert(requester, data) {
  if (requester.role !== 'user') throw httpError(403, 'Only care-users can create SOS alerts', 'FORBIDDEN');

  // Validate coordinates pair if provided
  const hasLat = data.latitude !== undefined && data.latitude !== null;
  const hasLng = data.longitude !== undefined && data.longitude !== null;
  if (hasLat !== hasLng) throw httpError(400, 'latitude and longitude must be provided together', 'VALIDATION_ERROR');

  let emergencyContactId = data.emergencyContactId ?? null;
  if (emergencyContactId) {
    const [c] = await pool.execute('SELECT id FROM emergency_contacts WHERE id = ? AND care_user_id = ? LIMIT 1', [emergencyContactId, requester.id]);
    if (!c.length) throw httpError(400, 'emergencyContactId does not belong to this care-user', 'VALIDATION_ERROR');
  }

  const locationStatus = hasLat && hasLng ? (data.locationStatus || 'available') : (data.locationStatus || 'unavailable');
  const lat = hasLat && hasLng ? data.latitude : null;
  const lng = hasLat && hasLng ? data.longitude : null;

  try {
    const [res] = await pool.execute(
      `INSERT INTO sos_alerts
       (care_user_id, emergency_contact_id, latitude, longitude, location_status, alert_status, delivery_status, delivery_channel, delivery_message, failure_reason, triggered_at, client_event_id)
       VALUES (?, ?, ?, ?, ?, 'created', 'pending', 'dashboard', ?, NULL, NOW(), ?)`,
      [
        requester.id,
        emergencyContactId,
        lat,
        lng,
        locationStatus,
        'SOS alert saved to dashboard for linked caregivers (no external delivery confirmed)',
        data.clientEventId || null,
      ]
    );
    const [rows] = await pool.execute('SELECT * FROM sos_alerts WHERE id = ?', [res.insertId]);
    return {
      alert: mapAlert(rows[0]),
      transmission: {
        saved: true,
        externalDeliveryConfirmed: false,
        message: 'SOS alert saved successfully. External notification delivery is not confirmed in this phase.'
      }
    };
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY' && data.clientEventId) {
      const [rows] = await pool.execute('SELECT * FROM sos_alerts WHERE client_event_id = ? LIMIT 1', [data.clientEventId]);
      if (rows.length) {
        return {
          alert: mapAlert(rows[0]),
          transmission: { saved: true, externalDeliveryConfirmed: false, message: 'Existing SOS alert returned for duplicate client event.' },
          idempotent: true
        };
      }
    }
    // DB unavailable/error cases will propagate to error handler
    throw e;
  }
}

async function ensureAlertAccess(requester, alertId) {
  const [rows] = await pool.execute('SELECT * FROM sos_alerts WHERE id = ? LIMIT 1', [alertId]);
  if (!rows.length) throw httpError(404, 'SOS alert not found', 'NOT_FOUND');
  const alert = rows[0];
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(alert.care_user_id)) throw httpError(403, 'Forbidden: cannot access another user\'s SOS alert', 'FORBIDDEN');
    return alert;
  }
  if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, alert.care_user_id);
    return alert;
  }
  throw httpError(403, 'Forbidden', 'FORBIDDEN');
}

async function listAlertsForCareUser(requester, careUserId) {
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(careUserId)) throw httpError(403, 'Forbidden', 'FORBIDDEN');
  } else if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, careUserId);
  } else throw httpError(403, 'Forbidden', 'FORBIDDEN');
  const [rows] = await pool.execute('SELECT * FROM sos_alerts WHERE care_user_id = ? ORDER BY triggered_at DESC, id DESC LIMIT 500', [careUserId]);
  return { alerts: rows.map(mapAlert) };
}

async function getAlert(requester, alertId) {
  const alert = await ensureAlertAccess(requester, alertId);
  return { alert: mapAlert(alert) };
}

async function acknowledgeAlert(caregiverId, alertId) {
  // verify caregiver has access
  const alert = await ensureAlertAccess({ id: caregiverId, role: 'caregiver' }, alertId);
  if (['acknowledged', 'cancelled'].includes(alert.alert_status)) {
    throw httpError(409, 'SOS alert is already in a final or acknowledged state', 'CONFLICT', { currentStatus: alert.alert_status });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.execute(
      `UPDATE sos_alerts
       SET alert_status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND alert_status IN ('created','pending','sent','failed')`,
      [caregiverId, alertId]
    );
    if (res.affectedRows === 0) {
      await conn.rollback();
      const [rows] = await pool.execute('SELECT alert_status FROM sos_alerts WHERE id = ?', [alertId]);
      throw httpError(409, 'SOS alert could not be acknowledged due to current state', 'CONFLICT', { currentStatus: rows[0]?.alert_status || null });
    }
    await conn.commit();
    const [rows] = await pool.execute('SELECT * FROM sos_alerts WHERE id = ?', [alertId]);
    return { alert: mapAlert(rows[0]) };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function resolveAlert(caregiverId, alertId) {
  // Schema does not include RESOLVED; closest supported terminal update for caregiver is 'cancelled' in enum, but spec asked for resolve endpoint.
  // Do not invent enum values. We support acknowledge; if caller requests resolve, reject as unsupported by schema to avoid false state changes.
  await ensureAlertAccess({ id: caregiverId, role: 'caregiver' }, alertId);
  throw httpError(400, 'Resolve status is not supported by the current sos_alerts.alert_status schema (supported: created,pending,sent,failed,acknowledged,cancelled)', 'UNSUPPORTED_STATUS');
}

async function cancelAlert(caregiverId, alertId) {
  // optional helper within schema support (cancelled exists)
  await ensureAlertAccess({ id: caregiverId, role: 'caregiver' }, alertId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.execute(
      `UPDATE sos_alerts SET alert_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND alert_status IN ('created','pending','sent','failed')`,
      [alertId]
    );
    if (res.affectedRows === 0) {
      await conn.rollback();
      const [rows] = await pool.execute('SELECT alert_status FROM sos_alerts WHERE id = ?', [alertId]);
      throw httpError(409, 'SOS alert could not be cancelled due to current state', 'CONFLICT', { currentStatus: rows[0]?.alert_status || null });
    }
    await conn.commit();
    const [rows] = await pool.execute('SELECT * FROM sos_alerts WHERE id = ?', [alertId]);
    return { alert: mapAlert(rows[0]) };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

module.exports = { createSosAlert, listAlertsForCareUser, getAlert, acknowledgeAlert, resolveAlert, cancelAlert };
