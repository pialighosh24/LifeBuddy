const { pool } = require('../config/db');

// Ensures caregiver is actively linked to care user; allows user to access self.
async function ensureCareAccess(req, res, next) {
  try {
    const careUserId = parseInt(req.params.careUserId || req.params.userId || req.body.careUserId || req.body.userId, 10);
    if (!careUserId) {
      return res.status(400).json({ success: false, message: 'careUserId/userId is required', code: 'VALIDATION_ERROR' });
    }
    if (req.user.role === 'user') {
      if (req.user.id !== careUserId) {
        return res.status(403).json({ success: false, message: 'Forbidden: cannot access another user', code: 'FORBIDDEN' });
      }
      req.careUserId = careUserId;
      return next();
    }
    if (req.user.role === 'caregiver') {
      const [rows] = await pool.execute(
        'SELECT id FROM caregiver_links WHERE caregiver_id = ? AND care_user_id = ? AND link_status = "active" LIMIT 1',
        [req.user.id, careUserId]
      );
      if (!rows.length) {
        return res.status(403).json({ success: false, message: 'Forbidden: caregiver not linked to this user', code: 'FORBIDDEN' });
      }
      req.careUserId = careUserId;
      return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { ensureCareAccess };
