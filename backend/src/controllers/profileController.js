const profileService = require('../services/profileService');
const { success } = require('../utils/response');
const { logEvent } = require('../services/activityLogService');

async function getProfile(req, res, next) {
  try {
    const result = await profileService.getAuthenticatedProfile(req.user.id);
    return success(res, 200, 'Profile retrieved successfully', result);
  } catch (err) { return next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const result = await profileService.updateAuthenticatedProfile(req.user.id, req.body);
    return success(res, 200, 'Profile updated successfully', result);
  } catch (err) { return next(err); }
}

async function getPreferences(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const result = await profileService.getPreferences(req.user, targetUserId);
    return success(res, 200, 'Preferences retrieved successfully', result);
  } catch (err) { return next(err); }
}

async function updatePreferences(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const result = await profileService.updatePreferences(req.user, targetUserId, req.body);
    await logEvent({ actorUserId: req.user.id, careUserId: Number(targetUserId), eventType: 'PREFERENCES_UPDATED', entityType: 'user_preferences', entityId: result.preferences && result.preferences.id, summary: 'Accessibility preferences updated' });
    return success(res, 200, 'Preferences updated successfully', result);
  } catch (err) { return next(err); }
}

module.exports = { getProfile, updateProfile, getPreferences, updatePreferences };
