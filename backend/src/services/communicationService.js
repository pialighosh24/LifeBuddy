const { pool } = require('../config/db');

function httpError(statusCode, message, code, errors) {
  const err = new Error(message);
  err.statusCode = statusCode; err.code = code; if (errors) err.errors = errors; return err;
}

function mapItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    itemKey: row.item_key,
    category: row.category,
    labelEn: row.label_en,
    labelBn: row.label_bn,
    iconKey: row.icon_key,
    speakTextEn: row.speak_text_en,
    speakTextBn: row.speak_text_bn,
    sentenceRole: row.sentence_role,
    sortOrder: row.sort_order,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listItems({ category, active = 'true' } = {}) {
  const where = [];
  const params = [];
  if (category) { where.push('category = ?'); params.push(category); }
  if (active === 'all') {
    // no filter
  } else if (active === 'false' || active === '0') {
    where.push('is_active = 0');
  } else {
    where.push('is_active = 1');
  }
  const sql = `SELECT * FROM communication_items ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY sort_order ASC, id ASC`;
  const [rows] = await pool.execute(sql, params);
  return { items: rows.map(mapItem) };
}

async function getCategories() {
  const [rows] = await pool.execute(
    `SELECT category, COUNT(*) AS item_count
     FROM communication_items
     WHERE is_active = 1
     GROUP BY category
     ORDER BY category ASC`
  );
  return { categories: rows.map(r => ({ category: r.category, itemCount: Number(r.item_count) })) };
}

async function getItem(itemId) {
  const [rows] = await pool.execute('SELECT * FROM communication_items WHERE id = ? LIMIT 1', [itemId]);
  if (!rows.length) throw httpError(404, 'Communication item not found', 'NOT_FOUND');
  return { item: mapItem(rows[0]) };
}

async function createItem(data) {
  try {
    const [res] = await pool.execute(
      `INSERT INTO communication_items (item_key, category, label_en, label_bn, icon_key, speak_text_en, speak_text_bn, sentence_role, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.itemKey,
        data.category || 'general',
        data.labelEn,
        data.labelBn ?? null,
        data.iconKey ?? null,
        data.speakTextEn,
        data.speakTextBn ?? null,
        data.sentenceRole || 'other',
        data.sortOrder ?? 0,
        data.isActive === false ? 0 : 1,
      ]
    );
    const [rows] = await pool.execute('SELECT * FROM communication_items WHERE id = ?', [res.insertId]);
    return { item: mapItem(rows[0]) };
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') throw httpError(409, 'Communication item key already exists', 'CONFLICT');
    throw e;
  }
}

async function updateItem(itemId, updates) {
  const [existing] = await pool.execute('SELECT id FROM communication_items WHERE id = ? LIMIT 1', [itemId]);
  if (!existing.length) throw httpError(404, 'Communication item not found', 'NOT_FOUND');
  const allowed = {
    category: 'category', labelEn: 'label_en', labelBn: 'label_bn', iconKey: 'icon_key',
    speakTextEn: 'speak_text_en', speakTextBn: 'speak_text_bn', sentenceRole: 'sentence_role',
    sortOrder: 'sort_order', isActive: 'is_active',
  };
  const sets = []; const values = [];
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
  await pool.execute(`UPDATE communication_items SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, itemId]);
  const [rows] = await pool.execute('SELECT * FROM communication_items WHERE id = ?', [itemId]);
  return { item: mapItem(rows[0]) };
}

async function deactivateItem(itemId) {
  const [existing] = await pool.execute('SELECT id FROM communication_items WHERE id = ? LIMIT 1', [itemId]);
  if (!existing.length) throw httpError(404, 'Communication item not found', 'NOT_FOUND');
  await pool.execute('UPDATE communication_items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [itemId]);
  const [rows] = await pool.execute('SELECT * FROM communication_items WHERE id = ?', [itemId]);
  return { item: mapItem(rows[0]) };
}

module.exports = { listItems, getCategories, getItem, createItem, updateItem, deactivateItem };
