const mysql = require('mysql2/promise');
const config = require('./env');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
});

async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    await connection.query('SELECT 1 AS ok');
    return { ok: true };
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
};
