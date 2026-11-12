function success(res, status, message, data = null, meta = undefined) {
  const payload = { success: true, message, data };
  if (meta !== undefined) payload.meta = meta;
  return res.status(status).json(payload);
}

function fail(res, status, message, errors = undefined, code = undefined) {
  const payload = { success: false, message };
  if (code) payload.code = code;
  if (errors !== undefined) payload.errors = errors;
  return res.status(status).json(payload);
}

module.exports = { success, fail };
