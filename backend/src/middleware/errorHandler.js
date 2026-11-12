const config = require('../config/env');

function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'NOT_FOUND',
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const isServer = status >= 500;
  const message = isServer ? 'Internal server error' : (err.message || 'Request failed');

  // Minimal logging without secrets
  if (config.nodeEnv !== 'test') {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${status}`, err.message);
    if (isServer && config.nodeEnv === 'development') {
      console.error(err.stack);
    }
  }

  const payload = {
    success: false,
    message,
    code: err.code || (isServer ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
  };
  if (err.errors) payload.errors = err.errors;

  return res.status(status).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
