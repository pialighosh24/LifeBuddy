const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  return value;
}

const config = {
  nodeEnv: required('NODE_ENV', 'development'),
  port: parseInt(required('PORT', '4000'), 10),
  db: {
    host: required('DB_HOST', 'localhost'),
    port: parseInt(required('DB_PORT', '3306'), 10),
    user: required('DB_USER', 'root'),
    password: required('DB_PASSWORD', ''),
    database: required('DB_NAME', 'lifebuddy_db'),
  },
  jwt: {
    secret: required('JWT_SECRET', 'dev-insecure-change-me'),
    expiresIn: required('JWT_EXPIRES_IN', '7d'),
  },
  security: {
    authRateLimitWindowMs: parseInt(required('AUTH_RATE_LIMIT_WINDOW_MS', '900000'), 10),
    authRateLimitMax: parseInt(required('AUTH_RATE_LIMIT_MAX', '20'), 10),
    corsOrigin: required('CORS_ORIGIN', ''),
  },
  bcryptSaltRounds: parseInt(required('BCRYPT_SALT_ROUNDS', '10'), 10),
};

module.exports = config;
