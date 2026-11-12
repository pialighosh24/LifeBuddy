const { verifyToken } = require('../utils/jwt');
const { pool } = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
    }
    const decoded = verifyToken(token);
    // Load fresh user status/role
    const [rows] = await pool.execute(
      'SELECT id, role, email, full_name, display_name, status, preferred_language FROM users WHERE id = ? LIMIT 1',
      [decoded.sub]
    );
    if (!rows.length || rows[0].status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid or inactive account', code: 'UNAUTHORIZED' });
    }
    req.user = {
      id: rows[0].id,
      role: rows[0].role,
      email: rows[0].email,
      fullName: rows[0].full_name,
      displayName: rows[0].display_name,
      preferredLanguage: rows[0].preferred_language,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role', code: 'FORBIDDEN' });
    }
    return next();
  };
}

module.exports = { authenticate, authorizeRoles };
