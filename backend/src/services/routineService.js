const { pool } = require('../config/db');

function httpError(statusCode, message, code, errors) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (errors) err.errors = errors;
  return err;
}

async function ensureActiveCaregiverLink(caregiverId, careUserId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.role, u.status
     FROM caregiver_links cl
     JOIN users u ON u.id = cl.care_user_id
     WHERE cl.caregiver_id = ? AND cl.care_user_id = ? AND cl.link_status = 'active' LIMIT 1`,
    [caregiverId, careUserId]
  );
  if (!rows.length) throw httpError(403, 'Forbidden: caregiver not linked to this user', 'FORBIDDEN');
  if (rows[0].role !== 'user') throw httpError(403, 'Target account is not a care-user', 'FORBIDDEN');
  return rows[0];
}

async function ensureRoutineAccess(requester, routineId, { caregiverManage = false } = {}) {
  const [rows] = await pool.execute(
    `SELECT r.*, u.role AS care_user_role
     FROM routines r
     JOIN users u ON u.id = r.care_user_id
     WHERE r.id = ? LIMIT 1`,
    [routineId]
  );
  if (!rows.length) throw httpError(404, 'Routine not found', 'NOT_FOUND');
  const routine = rows[0];

  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(routine.care_user_id)) {
      throw httpError(403, 'Forbidden: cannot access another user\'s routine', 'FORBIDDEN');
    }
    if (caregiverManage) throw httpError(403, 'Forbidden: insufficient role to modify routine', 'FORBIDDEN');
    return routine;
  }

  if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, routine.care_user_id);
    return routine;
  }

  throw httpError(403, 'Forbidden', 'FORBIDDEN');
}

function mapRoutine(row) {
  if (!row) return null;
  return {
    id: row.id,
    careUserId: row.care_user_id,
    createdByCaregiverId: row.created_by_caregiver_id,
    titleEn: row.title_en,
    titleBn: row.title_bn,
    descriptionEn: row.description_en,
    descriptionBn: row.description_bn,
    iconKey: row.icon_key,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStep(row) {
  if (!row) return null;
  return {
    id: row.id,
    routineId: row.routine_id,
    stepOrder: row.step_order,
    instructionEn: row.instruction_en,
    instructionBn: row.instruction_bn,
    imageKey: row.image_key,
    audioHintKey: row.audio_hint_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCompletion(row) {
  if (!row) return null;
  return {
    id: row.id,
    routineId: row.routine_id,
    routineStepId: row.routine_step_id,
    careUserId: row.care_user_id,
    completionStatus: row.completion_status,
    completedAt: row.completed_at,
    syncedAt: row.synced_at,
    source: row.source,
    clientEventId: row.client_event_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getRoutineWithSteps(routineId) {
  const [rRows] = await pool.execute('SELECT * FROM routines WHERE id = ? LIMIT 1', [routineId]);
  if (!rRows.length) throw httpError(404, 'Routine not found', 'NOT_FOUND');
  const [sRows] = await pool.execute('SELECT * FROM routine_steps WHERE routine_id = ? ORDER BY step_order ASC, id ASC', [routineId]);
  return { routine: mapRoutine(rRows[0]), steps: sRows.map(mapStep) };
}

async function createRoutine(caregiverId, careUserId, data) {
  await ensureActiveCaregiverLink(caregiverId, careUserId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.execute(
      `INSERT INTO routines (care_user_id, created_by_caregiver_id, title_en, title_bn, description_en, description_bn, icon_key, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        careUserId,
        caregiverId,
        data.titleEn,
        data.titleBn ?? null,
        data.descriptionEn ?? null,
        data.descriptionBn ?? null,
        data.iconKey ?? null,
        data.isActive === false ? 0 : 1,
      ]
    );
    const routineId = res.insertId;
    const steps = Array.isArray(data.steps) ? data.steps : [];
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i] || {};
      if (!s.instructionEn || !String(s.instructionEn).trim()) {
        throw httpError(400, 'Each step must include instructionEn', 'VALIDATION_ERROR');
      }
      await conn.execute(
        `INSERT INTO routine_steps (routine_id, step_order, instruction_en, instruction_bn, image_key, audio_hint_key)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [routineId, i + 1, String(s.instructionEn).trim(), s.instructionBn ?? null, s.imageKey ?? null, s.audioHintKey ?? null]
      );
    }
    await conn.commit();
    return getRoutineWithSteps(routineId);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function listRoutines(requester, careUserId) {
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(careUserId)) throw httpError(403, 'Forbidden: cannot access another user\'s routines', 'FORBIDDEN');
  } else if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, careUserId);
  } else {
    throw httpError(403, 'Forbidden', 'FORBIDDEN');
  }
  const [rows] = await pool.execute(
    `SELECT r.*, 
      (SELECT COUNT(*) FROM routine_steps s WHERE s.routine_id = r.id) AS step_count
     FROM routines r WHERE r.care_user_id = ? ORDER BY r.created_at DESC, r.id DESC`,
    [careUserId]
  );
  return { routines: rows.map(r => ({ ...mapRoutine(r), stepCount: Number(r.step_count || 0) })) };
}

async function getRoutine(requester, routineId) {
  await ensureRoutineAccess(requester, routineId);
  return getRoutineWithSteps(routineId);
}

async function updateRoutine(caregiverId, routineId, updates) {
  await ensureRoutineAccess({ id: caregiverId, role: 'caregiver' }, routineId, { caregiverManage: true });
  const allowed = {
    titleEn: 'title_en',
    titleBn: 'title_bn',
    descriptionEn: 'description_en',
    descriptionBn: 'description_bn',
    iconKey: 'icon_key',
    isActive: 'is_active',
  };
  const sets = [];
  const values = [];
  for (const [k, col] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(updates, k)) {
      sets.push(`${col} = ?`);
      let v = updates[k];
      if (k === 'isActive') v = v ? 1 : 0;
      if (v === '') v = null;
      values.push(v);
    }
  }
  if (!sets.length) throw httpError(400, 'No permitted fields provided for update', 'VALIDATION_ERROR');
  await pool.execute(`UPDATE routines SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, routineId]);
  return getRoutineWithSteps(routineId);
}

async function deleteRoutine(caregiverId, routineId) {
  await ensureRoutineAccess({ id: caregiverId, role: 'caregiver' }, routineId, { caregiverManage: true });
  // Cascade will remove steps and completions as per schema; safe for this routine only
  await pool.execute('DELETE FROM routines WHERE id = ?', [routineId]);
  return { deletedRoutineId: Number(routineId) };
}

async function addStep(caregiverId, routineId, data) {
  await ensureRoutineAccess({ id: caregiverId, role: 'caregiver' }, routineId, { caregiverManage: true });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let order = data.stepOrder;
    if (!order) {
      const [rows] = await conn.execute('SELECT COALESCE(MAX(step_order), 0) AS max_order FROM routine_steps WHERE routine_id = ?', [routineId]);
      order = Number(rows[0].max_order || 0) + 1;
    } else {
      // shift existing steps down to make room
      await conn.execute('UPDATE routine_steps SET step_order = step_order + 1000 WHERE routine_id = ? AND step_order >= ?', [routineId, order]);
      await conn.execute('UPDATE routine_steps SET step_order = step_order - 999 WHERE routine_id = ? AND step_order >= ?', [routineId, order + 1000]);
    }
    const [res] = await conn.execute(
      `INSERT INTO routine_steps (routine_id, step_order, instruction_en, instruction_bn, image_key, audio_hint_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [routineId, order, data.instructionEn, data.instructionBn ?? null, data.imageKey ?? null, data.audioHintKey ?? null]
    );
    await conn.commit();
    const [rows] = await pool.execute('SELECT * FROM routine_steps WHERE id = ?', [res.insertId]);
    return { step: mapStep(rows[0]) };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateStep(caregiverId, routineId, stepId, updates) {
  await ensureRoutineAccess({ id: caregiverId, role: 'caregiver' }, routineId, { caregiverManage: true });
  const [existing] = await pool.execute('SELECT * FROM routine_steps WHERE id = ? AND routine_id = ? LIMIT 1', [stepId, routineId]);
  if (!existing.length) throw httpError(404, 'Routine step not found', 'NOT_FOUND');

  const allowed = { instructionEn: 'instruction_en', instructionBn: 'instruction_bn', imageKey: 'image_key', audioHintKey: 'audio_hint_key' };
  const sets = [];
  const values = [];
  for (const [k, col] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(updates, k)) {
      sets.push(`${col} = ?`);
      const v = updates[k] === '' ? null : updates[k];
      values.push(v);
    }
  }
  // stepOrder change via update is complex with unique constraint; if requested, handle via reorder-like single move
  if (updates.stepOrder && Number(updates.stepOrder) !== Number(existing[0].step_order)) {
    // simple approach: reorder by constructing order with this step moved - easier to require reorder endpoint; but allow basic move
    await reorderSingleStep(routineId, stepId, Number(updates.stepOrder));
  }
  if (sets.length) {
    await pool.execute(`UPDATE routine_steps SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND routine_id = ?`, [...values, stepId, routineId]);
  } else if (!(updates.stepOrder && Number(updates.stepOrder) !== Number(existing[0].step_order))) {
    throw httpError(400, 'No permitted fields provided for update', 'VALIDATION_ERROR');
  }
  const [rows] = await pool.execute('SELECT * FROM routine_steps WHERE id = ?', [stepId]);
  return { step: mapStep(rows[0]) };
}

async function reorderSingleStep(routineId, stepId, newOrder) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [steps] = await conn.execute('SELECT id, step_order FROM routine_steps WHERE routine_id = ? ORDER BY step_order ASC, id ASC FOR UPDATE', [routineId]);
    const ids = steps.map(s => s.id);
    if (!ids.includes(Number(stepId))) throw httpError(404, 'Routine step not found', 'NOT_FOUND');
    const filtered = ids.filter(id => id !== Number(stepId));
    const idx = Math.max(0, Math.min(newOrder - 1, filtered.length));
    filtered.splice(idx, 0, Number(stepId));
    // apply temp offset then final order
    await conn.execute('UPDATE routine_steps SET step_order = step_order + 1000 WHERE routine_id = ?', [routineId]);
    for (let i = 0; i < filtered.length; i++) {
      await conn.execute('UPDATE routine_steps SET step_order = ? WHERE id = ? AND routine_id = ?', [i + 1, filtered[i], routineId]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function deleteStep(caregiverId, routineId, stepId) {
  await ensureRoutineAccess({ id: caregiverId, role: 'caregiver' }, routineId, { caregiverManage: true });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.execute('SELECT id FROM routine_steps WHERE id = ? AND routine_id = ? LIMIT 1', [stepId, routineId]);
    if (!existing.length) throw httpError(404, 'Routine step not found', 'NOT_FOUND');
    await conn.execute('DELETE FROM routine_steps WHERE id = ? AND routine_id = ?', [stepId, routineId]);
    const [remaining] = await conn.execute('SELECT id FROM routine_steps WHERE routine_id = ? ORDER BY step_order ASC, id ASC', [routineId]);
    await conn.execute('UPDATE routine_steps SET step_order = step_order + 1000 WHERE routine_id = ?', [routineId]);
    for (let i = 0; i < remaining.length; i++) {
      await conn.execute('UPDATE routine_steps SET step_order = ? WHERE id = ? AND routine_id = ?', [i + 1, remaining[i].id, routineId]);
    }
    await conn.commit();
    return { deletedStepId: Number(stepId) };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function reorderSteps(caregiverId, routineId, orderedStepIds) {
  await ensureRoutineAccess({ id: caregiverId, role: 'caregiver' }, routineId, { caregiverManage: true });
  const uniqueIds = [...new Set(orderedStepIds.map(Number))];
  if (uniqueIds.length !== orderedStepIds.length) throw httpError(400, 'orderedStepIds must not contain duplicates', 'VALIDATION_ERROR');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [steps] = await conn.execute('SELECT id FROM routine_steps WHERE routine_id = ? ORDER BY step_order ASC, id ASC FOR UPDATE', [routineId]);
    const currentIds = steps.map(s => Number(s.id));
    if (currentIds.length !== uniqueIds.length || !currentIds.every(id => uniqueIds.includes(id))) {
      throw httpError(400, 'orderedStepIds must include exactly all step ids for the routine', 'VALIDATION_ERROR');
    }
    await conn.execute('UPDATE routine_steps SET step_order = step_order + 1000 WHERE routine_id = ?', [routineId]);
    for (let i = 0; i < uniqueIds.length; i++) {
      await conn.execute('UPDATE routine_steps SET step_order = ? WHERE id = ? AND routine_id = ?', [i + 1, uniqueIds[i], routineId]);
    }
    await conn.commit();
    return getRoutineWithSteps(routineId);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function createCompletion(requester, routineId, data) {
  const routine = await ensureRoutineAccess(requester, routineId, { caregiverManage: false }); // care-user allowed; caregiver allowed if linked
  const [stepRows] = await pool.execute('SELECT id FROM routine_steps WHERE id = ? AND routine_id = ? LIMIT 1', [data.routineStepId, routineId]);
  if (!stepRows.length) throw httpError(400, 'routineStepId does not belong to the routine', 'VALIDATION_ERROR');

  const careUserId = routine.care_user_id;
  if (requester.role === 'user' && Number(requester.id) !== Number(careUserId)) {
    throw httpError(403, 'Forbidden: cannot create completion for another user', 'FORBIDDEN');
  }

  const completedAt = data.completedAt ? new Date(data.completedAt) : new Date();
  if (Number.isNaN(completedAt.getTime())) throw httpError(400, 'Invalid completedAt', 'VALIDATION_ERROR');
  const mysqlCompletedAt = completedAt.toISOString().slice(0, 19).replace('T', ' ');

  try {
    const [res] = await pool.execute(
      `INSERT INTO routine_completions
       (routine_id, routine_step_id, care_user_id, completion_status, completed_at, synced_at, source, client_event_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routineId,
        data.routineStepId,
        careUserId,
        data.completionStatus || 'completed',
        mysqlCompletedAt,
        data.source === 'offline_sync' ? mysqlCompletedAt : mysqlCompletedAt,
        data.source || 'online',
        data.clientEventId || null,
        data.notes ?? null,
      ]
    );
    const [rows] = await pool.execute('SELECT * FROM routine_completions WHERE id = ?', [res.insertId]);
    return { completion: mapCompletion(rows[0]) };
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY' && data.clientEventId) {
      // idempotent for offline sync client_event_id
      const [rows] = await pool.execute('SELECT * FROM routine_completions WHERE client_event_id = ? LIMIT 1', [data.clientEventId]);
      if (rows.length) return { completion: mapCompletion(rows[0]), idempotent: true };
      throw httpError(409, 'Duplicate completion record', 'CONFLICT');
    }
    throw e;
  }
}

async function getCompletions(requester, routineId, query = {}) {
  await ensureRoutineAccess(requester, routineId);
  const params = [routineId];
  let where = 'WHERE routine_id = ?';
  if (query.date) { where += ' AND DATE(completed_at) = ?'; params.push(query.date); }
  if (query.from) { where += ' AND completed_at >= ?'; params.push(query.from); }
  if (query.to) { where += ' AND completed_at <= ?'; params.push(query.to); }
  const [rows] = await pool.execute(
    `SELECT * FROM routine_completions ${where} ORDER BY completed_at DESC, id DESC LIMIT 500`,
    params
  );
  return { completions: rows.map(mapCompletion) };
}

async function getRoutineProgress(requester, careUserId, query = {}) {
  if (requester.role === 'user') {
    if (Number(requester.id) !== Number(careUserId)) throw httpError(403, 'Forbidden: cannot access another user\'s progress', 'FORBIDDEN');
  } else if (requester.role === 'caregiver') {
    await ensureActiveCaregiverLink(requester.id, careUserId);
  } else {
    throw httpError(403, 'Forbidden', 'FORBIDDEN');
  }

  const date = query.date || new Date().toISOString().slice(0, 10);
  const [routines] = await pool.execute(
    `SELECT r.id, r.title_en, r.title_bn, r.is_active,
      (SELECT COUNT(*) FROM routine_steps s WHERE s.routine_id = r.id) AS step_count
     FROM routines r WHERE r.care_user_id = ? ORDER BY r.id ASC`,
    [careUserId]
  );
  const routineIds = routines.map(r => r.id);
  let completions = [];
  if (routineIds.length) {
    const placeholders = routineIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT routine_id, routine_step_id, completion_status, completed_at
       FROM routine_completions
       WHERE care_user_id = ? AND DATE(completed_at) = ? AND routine_id IN (${placeholders})
       ORDER BY completed_at ASC`,
      [careUserId, date, ...routineIds]
    );
    completions = rows;
  }

  const byRoutine = {};
  for (const c of completions) {
    if (!byRoutine[c.routine_id]) byRoutine[c.routine_id] = [];
    byRoutine[c.routine_id].push(c);
  }

  const progress = routines.map(r => {
    const comps = byRoutine[r.id] || [];
    const completedSteps = new Set(comps.filter(c => c.completion_status === 'completed').map(c => c.routine_step_id)).size;
    const skippedSteps = new Set(comps.filter(c => c.completion_status === 'skipped').map(c => c.routine_step_id)).size;
    const totalSteps = Number(r.step_count || 0);
    const doneCount = completedSteps; // conservative progress by completed steps
    const percent = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
    return {
      routineId: r.id,
      titleEn: r.title_en,
      titleBn: r.title_bn,
      isActive: !!r.is_active,
      date,
      totalSteps,
      completedSteps,
      skippedSteps,
      completionRecords: comps.length,
      progressPercent: percent,
      status: totalSteps > 0 && completedSteps >= totalSteps ? 'completed' : comps.length ? 'in_progress' : 'not_started',
    };
  });

  return { careUserId: Number(careUserId), date, progress };
}

module.exports = {
  createRoutine,
  listRoutines,
  getRoutine,
  updateRoutine,
  deleteRoutine,
  addStep,
  updateStep,
  deleteStep,
  reorderSteps,
  createCompletion,
  getCompletions,
  getRoutineProgress,
};
