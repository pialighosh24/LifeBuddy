const { pool } = require('../config/db');

function httpError(statusCode, message, code) {
  const err = new Error(message);
  err.statusCode = statusCode; err.code = code; return err;
}

function mapStep(row) {
  if (!row) return null;
  return {
    id: row.id,
    careUserId: row.care_user_id,
    situationKey: row.situation_key,
    titleEn: row.title_en,
    titleBn: row.title_bn,
    stepOrder: row.step_order,
    instructionEn: row.instruction_en,
    instructionBn: row.instruction_bn,
    imageKey: row.image_key,
    isPredefined: !!row.is_predefined,
    isActive: !!row.is_active,
  };
}

async function listSituations({ includeInactive = false, careUserId = null } = {}) {
  // Return situations (grouped by key) visible globally/predefined and optionally custom for a user
  const params = [];
  let where = [];
  if (!includeInactive) where.push('is_active = 1');
  // show predefined/global (care_user_id IS NULL) and, if careUserId provided, that user's custom ones
  if (careUserId) {
    where.push('(care_user_id IS NULL OR care_user_id = ?)');
    params.push(careUserId);
  } else {
    where.push('(care_user_id IS NULL)');
  }
  const sql = `SELECT situation_key, care_user_id, MIN(title_en) AS title_en, MIN(title_bn) AS title_bn,
                      MAX(is_predefined) AS is_predefined, MAX(is_active) AS is_active,
                      COUNT(*) AS step_count, MIN(step_order) AS min_step
               FROM situation_steps
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               GROUP BY situation_key, care_user_id
               ORDER BY situation_key ASC`;
  const [rows] = await pool.execute(sql, params);
  return {
    situations: rows.map(r => ({
      situationKey: r.situation_key,
      careUserId: r.care_user_id,
      titleEn: r.title_en,
      titleBn: r.title_bn,
      isPredefined: !!r.is_predefined,
      isActive: !!r.is_active,
      stepCount: Number(r.step_count),
    }))
  };
}

async function getSituation(situationKey, { careUserId = null, includeInactive = false } = {}) {
  // Prefer user-specific if careUserId given, else predefined/global
  const params = [situationKey];
  let where = 'WHERE situation_key = ?';
  if (!includeInactive) where += ' AND is_active = 1';
  if (careUserId) {
    where += ' AND (care_user_id = ? OR care_user_id IS NULL)';
    params.push(careUserId);
  } else {
    where += ' AND care_user_id IS NULL';
  }
  const [rows] = await pool.execute(
    `SELECT * FROM situation_steps ${where} ORDER BY (care_user_id IS NOT NULL) DESC, step_order ASC, id ASC`,
    params
  );
  if (!rows.length) throw httpError(404, 'Situation not found', 'NOT_FOUND');
  // if both custom and global exist and careUserId provided, pick custom set
  const hasCustom = rows.some(r => Number(r.care_user_id) === Number(careUserId));
  const filtered = hasCustom ? rows.filter(r => Number(r.care_user_id) === Number(careUserId)) : rows.filter(r => r.care_user_id === null);
  const steps = filtered.map(mapStep).sort((a,b)=>a.stepOrder-b.stepOrder);
  return {
    situation: {
      situationKey,
      careUserId: steps[0]?.careUserId ?? null,
      titleEn: steps[0]?.titleEn || null,
      titleBn: steps[0]?.titleBn || null,
      isPredefined: steps[0]?.isPredefined ?? true,
      isActive: steps.every(s => s.isActive),
      stepCount: steps.length,
    },
    steps,
  };
}

module.exports = { listSituations, getSituation };
