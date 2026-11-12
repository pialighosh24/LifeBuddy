const app = require('./app');
const config = require('./config/env');
const { testConnection } = require('./config/db');

async function start() {
  try {
    await testConnection();
    console.log('MySQL connection: OK');
  } catch (err) {
    console.error('MySQL connection: FAILED -', err.message);
    console.error('Server will start, but database-backed endpoints will fail until DB is reachable.');
  }

  app.listen(config.port, () => {
    console.log(`Life Buddy backend listening on port ${config.port} (${config.nodeEnv})`);
  });
}

start();
