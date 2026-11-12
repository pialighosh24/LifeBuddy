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
  if (rows[0].role !== 'user') throw httpError(403, 'Target account is not a care-user', 'FORBIDDEN');
  return rows[0];
}

function mapContact(row) {
  if (!row) return null;
  return {
    id: row.id,
    careUserId: row.care_user_id,
    contactName: row.contact_name,
    relationshipLabel: row.relationship_label,
    phoneNumber: row.phone_number,
    email: row.email,
    isPrimary: !!row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getContactRow(contactId) {
  const [rows] = await pool.execute('SELECT * FROM emergency_contacts WHERE id = ? LIMIT 1', [contactId]);
  if (!rows.length) throw httpError(404, 'Emergency contact not found', 'NOT_FOUND');
  return rows[0];
}

async function ensureContactAccess(requester, contactId, { caregiverManage = false } = {}) {
  const contact = await getContactRow(contactId);
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(contact.care_user_id)) throw httpError(403, 'Forbidden: cannot access another user\'s contacts', 'FORBIDDEN');
    if (caregiverManage) throw httpError(403, 'Forbidden: insufficient role', 'FORBIDDEN');
    return contact;
  }
  if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, contact.care_user_id);
    return contact;
  }
  throw httpError(403, 'Forbidden', 'FORBIDDEN');
}

async function createContact(caregiverId, careUserId, data) {
  await ensureActiveCaregiverLink(caregiverId, careUserId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const makePrimary = data.isPrimary === true;
    if (makePrimary) {
      await conn.execute('UPDATE emergency_contacts SET is_primary = 0 WHERE care_user_id = ?', [careUserId]);
    }
    // If first contact and no primary specified, make it primary for consistency
    const [existing] = await conn.execute('SELECT COUNT(*) AS cnt FROM emergency_contacts WHERE care_user_id = ?', [careUserId]);
    const isPrimary = makePrimary || Number(existing[0].cnt) === 0 ? 1 : 0;
    if (isPrimary) {
      await conn.execute('UPDATE emergency_contacts SET is_primary = 0 WHERE care_user_id = ?', [careUserId]);
    }
    const [res] = await conn.execute(
      `INSERT INTO emergency_contacts (care_user_id, contact_name, relationship_label, phone_number, email, is_primary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [careUserId, data.contactName, data.relationshipLabel ?? null, data.phoneNumber, data.email ?? null, isPrimary]
    );
    await conn.commit();
    const [rows] = await pool.execute('SELECT * FROM emergency_contacts WHERE id = ?', [res.insertId]);
    return { contact: mapContact(rows[0]) };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally { conn.release(); }
}

async function listContacts(requester, careUserId) {
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(careUserId)) throw httpError(403, 'Forbidden: cannot access another user\'s contacts', 'FORBIDDEN');
  } else if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, careUserId);
  } else throw httpError(403, 'Forbidden', 'FORBIDDEN');
  const [rows] = await pool.execute('SELECT * FROM emergency_contacts WHERE care_user_id = ? ORDER BY is_primary DESC, created_at DESC, id DESC', [careUserId]);
  return { contacts: rows.map(mapContact) };
}

async function getContact(requester, contactId) {
  const contact = await ensureContactAccess(requester, contactId);
  return { contact: mapContact(contact) };
}

async function updateContact(caregiverId, contactId, updates) {
  const contact = await ensureContactAccess({ id: caregiverId, role: 'caregiver' }, contactId, { caregiverManage: true });
  const careUserId = contact.care_user_id;
  const allowed = { contactName: 'contact_name', relationshipLabel: 'relationship_label', phoneNumber: 'phone_number', email: 'email', isPrimary: 'is_primary' };
  const sets = []; const values = [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (updates.isPrimary === true) {
      await conn.execute('UPDATE emergency_contacts SET is_primary = 0 WHERE care_user_id = ?', [careUserId]);
    }
    for (const [k, col] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(updates, k)) {
        sets.push(`${col} = ?`);
        let v = updates[k];
        if (k === 'isPrimary') v = v ? 1 : 0;
        if (v === '') v = null;
        values.push(v);
      }
    }
    if (!sets.length) throw httpError(400, 'No permitted fields provided for update', 'VALIDATION_ERROR');
    await conn.execute(`UPDATE emergency_contacts SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, contactId]);
    // ensure at least one primary remains if any contacts exist
    const [prim] = await conn.execute('SELECT id FROM emergency_contacts WHERE care_user_id = ? AND is_primary = 1 LIMIT 1', [careUserId]);
    if (!prim.length) {
      const [any] = await conn.execute('SELECT id FROM emergency_contacts WHERE care_user_id = ? ORDER BY created_at ASC, id ASC LIMIT 1', [careUserId]);
      if (any.length) await conn.execute('UPDATE emergency_contacts SET is_primary = 1 WHERE id = ?', [any[0].id]);
    }
    await conn.commit();
    const [rows] = await pool.execute('SELECT * FROM emergency_contacts WHERE id = ?', [contactId]);
    return { contact: mapContact(rows[0]) };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function deleteContact(caregiverId, contactId) {
  const contact = await ensureContactAccess({ id: caregiverId, role: 'caregiver' }, contactId, { caregiverManage: true });
  const careUserId = contact.care_user_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM emergency_contacts WHERE id = ?', [contactId]);
    const [prim] = await conn.execute('SELECT id FROM emergency_contacts WHERE care_user_id = ? AND is_primary = 1 LIMIT 1', [careUserId]);
    if (!prim.length) {
      const [any] = await conn.execute('SELECT id FROM emergency_contacts WHERE care_user_id = ? ORDER BY created_at ASC, id ASC LIMIT 1', [careUserId]);
      if (any.length) await conn.execute('UPDATE emergency_contacts SET is_primary = 1 WHERE id = ?', [any[0].id]);
    }
    await conn.commit();
    return { deletedContactId: Number(contactId), careUserId: Number(careUserId) };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

module.exports = { createContact, listContacts, getContact, updateContact, deleteContact };
