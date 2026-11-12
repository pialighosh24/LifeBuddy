const authService = require('../services/authService');
const { success } = require('../utils/response');
const { logEvent } = require('../services/activityLogService');

async function registerCaregiver(req, res, next) {
  try {
    const result = await authService.registerCaregiver(req.body);
    return success(res, 201, 'Caregiver registered successfully', result);
  } catch (err) { return next(err); }
}

async function loginCaregiver(req, res, next) {
  try {
    const result = await authService.loginCaregiver(req.body);
    await logEvent({ actorUserId: result.user.id, careUserId: null, eventType: 'CAREGIVER_LOGIN', entityType: 'user', entityId: result.user.id, summary: 'Caregiver logged in' });
    return success(res, 200, 'Login successful', result);
  } catch (err) { return next(err); }
}

async function setupUserPin(req, res, next) {
  try {
    const result = await authService.setupUserPin({
      caregiverId: req.user.id,
      careUserId: req.body.careUserId,
      pin: req.body.pin,
      fullName: req.body.fullName,
      displayName: req.body.displayName,
      preferredLanguage: req.body.preferredLanguage,
    });
    return success(res, 200, 'User PIN set successfully', { user: result });
  } catch (err) { return next(err); }
}

async function loginUser(req, res, next) {
  try {
    const result = await authService.loginUserWithPin({
      careUserId: req.body.careUserId,
      pin: req.body.pin,
    });
    await logEvent({ actorUserId: result.user.id, careUserId: result.user.id, eventType: 'USER_LOGIN', entityType: 'user', entityId: result.user.id, summary: 'Care-user logged in' });
    return success(res, 200, 'Login successful', result);
  } catch (err) { return next(err); }
}

async function me(req, res) {
  return success(res, 200, 'Authenticated user', { user: req.user });
}

async function logout(req, res) {
  // JWT is stateless in current design; client should discard token.
  return success(res, 200, 'Logged out successfully', null);
}

module.exports = { registerCaregiver, loginCaregiver, setupUserPin, loginUser, me, logout };
