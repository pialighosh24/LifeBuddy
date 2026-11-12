const { pool } = require('../config/db');

function httpError(statusCode, message, code, errors) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (errors) err.errors = errors;
  return err;
}

function toMysqlDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function toMysqlDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
function normalizeStoredDate(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return toMysqlDate(s);
  }
  return toMysqlDate(value);
}
function normalizeTime(t) {
  if (!t) return t;
  return t.length === 5 ? `${t}:00` : t; // HH:MM -> HH:MM:SS
}

async function ensureActiveCaregiverLink(caregiverId, careUserId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.role FROM caregiver_links cl JOIN users u ON u.id = cl.care_user_id
     WHERE cl.caregiver_id = ? AND cl.care_user_id = ? AND cl.link_status = 'active' LIMIT 1`,
    [caregiverId, careUserId]
  );
  if (!rows.length) throw httpError(403, 'Forbidden: caregiver not linked to this user', 'FORBIDDEN');
  if (rows[0].role !== 'user') throw httpError(403, 'Target account is not a care-user', 'FORBIDDEN');
  return rows[0];
}

function mapMedicine(row) {
  if (!row) return null;
  return {
    id: row.id,
    careUserId: row.care_user_id,
    createdByCaregiverId: row.created_by_caregiver_id,
    medicineName: row.medicine_name,
    prescribedInstructions: row.prescribed_instructions,
    notes: row.notes,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapReminder(row) {
  if (!row) return null;
  return {
    id: row.id,
    medicineId: row.medicine_id,
    reminderTime: row.reminder_time,
    frequency: row.frequency,
    daysOfWeek: row.days_of_week,
    reminderLabel: row.reminder_label,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    medicineId: row.medicine_id,
    reminderId: row.reminder_id,
    careUserId: row.care_user_id,
    scheduledFor: row.scheduled_for,
    status: row.status,
    respondedAt: row.responded_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureMedicineAccess(requester, medicineId, { caregiverManage = false } = {}) {
  const [rows] = await pool.execute('SELECT * FROM medicines WHERE id = ? LIMIT 1', [medicineId]);
  if (!rows.length) throw httpError(404, 'Medicine not found', 'NOT_FOUND');
  const med = rows[0];
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(med.care_user_id)) throw httpError(403, 'Forbidden: cannot access another user\'s medicine', 'FORBIDDEN');
    if (caregiverManage) throw httpError(403, 'Forbidden: insufficient role', 'FORBIDDEN');
    return med;
  }
  if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, med.care_user_id);
    return med;
  }
  throw httpError(403, 'Forbidden', 'FORBIDDEN');
}

async function createMedicine(caregiverId, careUserId, data) {
  await ensureActiveCaregiverLink(caregiverId, careUserId);
  const startDate = data.startDate ? toMysqlDate(data.startDate) : null;
  const endDate = data.endDate ? toMysqlDate(data.endDate) : null;
  if (data.startDate && !startDate) throw httpError(400, 'Invalid startDate', 'VALIDATION_ERROR');
  if (data.endDate && !endDate) throw httpError(400, 'Invalid endDate', 'VALIDATION_ERROR');
  if (startDate && endDate && endDate < startDate) throw httpError(400, 'endDate must be on or after startDate', 'VALIDATION_ERROR');
  const [res] = await pool.execute(
    `INSERT INTO medicines (care_user_id, created_by_caregiver_id, medicine_name, prescribed_instructions, notes, start_date, end_date, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [careUserId, caregiverId, data.medicineName, data.prescribedInstructions ?? null, data.notes ?? null, startDate, endDate, data.isActive === false ? 0 : 1]
  );
  const [rows] = await pool.execute('SELECT * FROM medicines WHERE id = ?', [res.insertId]);
  return { medicine: mapMedicine(rows[0]) };
}

async function listMedicines(requester, careUserId) {
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(careUserId)) throw httpError(403, 'Forbidden: cannot access another user\'s medicines', 'FORBIDDEN');
  } else if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, careUserId);
  } else throw httpError(403, 'Forbidden', 'FORBIDDEN');

  const [rows] = await pool.execute('SELECT * FROM medicines WHERE care_user_id = ? ORDER BY created_at DESC, id DESC', [careUserId]);
  return { medicines: rows.map(mapMedicine) };
}

async function getMedicine(requester, medicineId) {
  await ensureMedicineAccess(requester, medicineId);
  const [rows] = await pool.execute('SELECT * FROM medicines WHERE id = ? LIMIT 1', [medicineId]);
  const [rems] = await pool.execute('SELECT * FROM medicine_reminders WHERE medicine_id = ? ORDER BY reminder_time ASC, id ASC', [medicineId]);
  return { medicine: mapMedicine(rows[0]), reminders: rems.map(mapReminder) };
}

async function updateMedicine(caregiverId, medicineId, updates) {
  const med = await ensureMedicineAccess({ id: caregiverId, role: 'caregiver' }, medicineId, { caregiverManage: true });
  const allowed = {
    medicineName: 'medicine_name',
    prescribedInstructions: 'prescribed_instructions',
    notes: 'notes',
    startDate: 'start_date',
    endDate: 'end_date',
    isActive: 'is_active',
  };
  const sets = []; const values = [];
  let startDate = normalizeStoredDate(med.start_date);
  let endDate = normalizeStoredDate(med.end_date);
  if (Object.prototype.hasOwnProperty.call(updates, 'startDate')) {
    if (updates.startDate === null || updates.startDate === '') {
      startDate = null;
    } else {
      startDate = toMysqlDate(updates.startDate);
      if (!startDate) throw httpError(400, 'Invalid startDate', 'VALIDATION_ERROR');
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'endDate')) {
    if (updates.endDate === null || updates.endDate === '') {
      endDate = null;
    } else {
      endDate = toMysqlDate(updates.endDate);
      if (!endDate) throw httpError(400, 'Invalid endDate', 'VALIDATION_ERROR');
    }
  }
  if (startDate && endDate && endDate < startDate) throw httpError(400, 'endDate must be on or after startDate', 'VALIDATION_ERROR');

  for (const [k, col] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(updates, k)) {
      sets.push(`${col} = ?`);
      let v = updates[k];
      if (k === 'isActive') v = v ? 1 : 0;
      else if (k === 'startDate') v = startDate;
      else if (k === 'endDate') v = endDate;
      else if (v === '') v = null;
      values.push(v);
    }
  }
  if (!sets.length) throw httpError(400, 'No permitted fields provided for update', 'VALIDATION_ERROR');
  await pool.execute(`UPDATE medicines SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, medicineId]);
  const [rows] = await pool.execute('SELECT * FROM medicines WHERE id = ?', [medicineId]);
  return { medicine: mapMedicine(rows[0]) };
}

async function deleteOrDeactivateMedicine(caregiverId, medicineId, { hardDelete = false } = {}) {
  await ensureMedicineAccess({ id: caregiverId, role: 'caregiver' }, medicineId, { caregiverManage: true });
  if (hardDelete) {
    // cascading per schema: reminders/logs cascade from medicine; safe for this medicine record only
    await pool.execute('DELETE FROM medicines WHERE id = ?', [medicineId]);
    return { deletedMedicineId: Number(medicineId) };
  }
  await pool.execute('UPDATE medicines SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [medicineId]);
  const [rows] = await pool.execute('SELECT * FROM medicines WHERE id = ?', [medicineId]);
  return { medicine: mapMedicine(rows[0]) };
}

async function createReminder(caregiverId, medicineId, data) {
  await ensureMedicineAccess({ id: caregiverId, role: 'caregiver' }, medicineId, { caregiverManage: true });
  const [res] = await pool.execute(
    `INSERT INTO medicine_reminders (medicine_id, reminder_time, frequency, days_of_week, reminder_label, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [medicineId, normalizeTime(data.reminderTime), data.frequency || 'daily', data.daysOfWeek ?? null, data.reminderLabel ?? null, data.isActive === false ? 0 : 1]
  );
  const [rows] = await pool.execute('SELECT * FROM medicine_reminders WHERE id = ?', [res.insertId]);
  return { reminder: mapReminder(rows[0]) };
}

async function listReminders(requester, medicineId) {
  await ensureMedicineAccess(requester, medicineId);
  const [rows] = await pool.execute('SELECT * FROM medicine_reminders WHERE medicine_id = ? ORDER BY reminder_time ASC, id ASC', [medicineId]);
  return { reminders: rows.map(mapReminder) };
}

async function updateReminder(caregiverId, medicineId, reminderId, updates) {
  await ensureMedicineAccess({ id: caregiverId, role: 'caregiver' }, medicineId, { caregiverManage: true });
  const [existing] = await pool.execute('SELECT * FROM medicine_reminders WHERE id = ? AND medicine_id = ? LIMIT 1', [reminderId, medicineId]);
  if (!existing.length) throw httpError(404, 'Reminder not found', 'NOT_FOUND');
  const allowed = { reminderTime: 'reminder_time', frequency: 'frequency', daysOfWeek: 'days_of_week', reminderLabel: 'reminder_label', isActive: 'is_active' };
  const sets = []; const values = [];
  for (const [k, col] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(updates, k)) {
      sets.push(`${col} = ?`);
      let v = updates[k];
      if (k === 'isActive') v = v ? 1 : 0;
      if (k === 'reminderTime') v = normalizeTime(v);
      if (v === '') v = null;
      values.push(v);
    }
  }
  if (!sets.length) throw httpError(400, 'No permitted fields provided for update', 'VALIDATION_ERROR');
  await pool.execute(`UPDATE medicine_reminders SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND medicine_id = ?`, [...values, reminderId, medicineId]);
  const [rows] = await pool.execute('SELECT * FROM medicine_reminders WHERE id = ?', [reminderId]);
  return { reminder: mapReminder(rows[0]) };
}

async function deleteOrDeactivateReminder(caregiverId, medicineId, reminderId, { hardDelete = true } = {}) {
  await ensureMedicineAccess({ id: caregiverId, role: 'caregiver' }, medicineId, { caregiverManage: true });
  const [existing] = await pool.execute('SELECT id FROM medicine_reminders WHERE id = ? AND medicine_id = ? LIMIT 1', [reminderId, medicineId]);
  if (!existing.length) throw httpError(404, 'Reminder not found', 'NOT_FOUND');
  if (hardDelete) {
    await pool.execute('DELETE FROM medicine_reminders WHERE id = ? AND medicine_id = ?', [reminderId, medicineId]);
    return { deletedReminderId: Number(reminderId) };
  }
  await pool.execute('UPDATE medicine_reminders SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [reminderId]);
  const [rows] = await pool.execute('SELECT * FROM medicine_reminders WHERE id = ?', [reminderId]);
  return { reminder: mapReminder(rows[0]) };
}

async function createLog(requester, medicineId, data) {
  const med = await ensureMedicineAccess(requester, medicineId, { caregiverManage: false });
  const careUserId = med.care_user_id;
  if (requester.role === 'user' && Number(requester.id) !== Number(careUserId)) {
    throw httpError(403, 'Forbidden: cannot record log for another user', 'FORBIDDEN');
  }
  if (requester.role === 'caregiver') {
    // must be linked (already ensured by ensureMedicineAccess) - caregiver can record on behalf? allowed as linked caregiver
  }
  const scheduledFor = toMysqlDateTime(data.scheduledFor);
  if (!scheduledFor) throw httpError(400, 'Invalid scheduledFor', 'VALIDATION_ERROR');
  let respondedAt = null;
  if (data.respondedAt) {
    respondedAt = toMysqlDateTime(data.respondedAt);
    if (!respondedAt) throw httpError(400, 'Invalid respondedAt', 'VALIDATION_ERROR');
  } else if (data.status === 'taken' || data.status === 'skipped' || data.status === 'missed') {
    respondedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  let reminderId = data.reminderId ?? null;
  if (reminderId) {
    const [r] = await pool.execute('SELECT id FROM medicine_reminders WHERE id = ? AND medicine_id = ? LIMIT 1', [reminderId, medicineId]);
    if (!r.length) throw httpError(400, 'reminderId does not belong to this medicine', 'VALIDATION_ERROR');
  }
  const [res] = await pool.execute(
    `INSERT INTO medicine_logs (medicine_id, reminder_id, care_user_id, scheduled_for, status, responded_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [medicineId, reminderId, careUserId, scheduledFor, data.status, respondedAt, data.notes ?? null]
  );
  const [rows] = await pool.execute('SELECT * FROM medicine_logs WHERE id = ?', [res.insertId]);
  return { log: mapLog(rows[0]) };
}

async function getMedicineLogs(requester, medicineId) {
  await ensureMedicineAccess(requester, medicineId);
  const [rows] = await pool.execute(
    'SELECT * FROM medicine_logs WHERE medicine_id = ? ORDER BY scheduled_for DESC, id DESC LIMIT 500',
    [medicineId]
  );
  return { logs: rows.map(mapLog) };
}

async function getMedicineHistory(requester, careUserId) {
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(careUserId)) throw httpError(403, 'Forbidden: cannot access another user\'s medicine history', 'FORBIDDEN');
  } else if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, careUserId);
  } else throw httpError(403, 'Forbidden', 'FORBIDDEN');
  const [rows] = await pool.execute(
    `SELECT ml.*, m.medicine_name
     FROM medicine_logs ml
     JOIN medicines m ON m.id = ml.medicine_id
     WHERE ml.care_user_id = ?
     ORDER BY ml.scheduled_for DESC, ml.id DESC
     LIMIT 500`,
    [careUserId]
  );
  return { careUserId: Number(careUserId), history: rows.map(r => ({ ...mapLog(r), medicineName: r.medicine_name })) };
}

module.exports = {
  createMedicine,
  listMedicines,
  getMedicine,
  updateMedicine,
  deleteOrDeactivateMedicine,
  createReminder,
  listReminders,
  updateReminder,
  deleteOrDeactivateReminder,
  createLog,
  getMedicineLogs,
  getMedicineHistory,
};
