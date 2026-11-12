const { testConnection } = require('../config/db');

async function getHealth(req, res) {
  const started = Date.now();
  let db = { connected: false };
  try {
    await testConnection();
    db = { connected: true };
  } catch (err) {
    db = { connected: false, error: 'Database unreachable' };
  }
  const statusCode = db.connected ? 200 : 503;
  return res.status(statusCode).json({
    success: db.connected,
    message: db.connected ? 'Service healthy' : 'Service degraded: database not connected',
    data: {
      service: 'lifebuddy-backend',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - started,
      database: db,
    },
  });
}

module.exports = { getHealth };
