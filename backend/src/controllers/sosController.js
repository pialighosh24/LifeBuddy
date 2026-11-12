const service = require('../services/sosService');
const { success } = require('../utils/response');
const { logEvent } = require('../services/activityLogService');

async function createSos(req, res, next) {
  try {
    const result = await service.createSosAlert(req.user, req.body);
    const activity = await logEvent({ actorUserId: req.user.id, careUserId: req.user.id, eventType: 'SOS_CREATED', entityType: 'sos_alert', entityId: result.alert && result.alert.id, summary: 'SOS alert created' });
    result.activityLog = activity;
    return success(res, 201, 'SOS alert saved successfully', result);
  }
  catch (err) { return next(err); }
}
async function listForCareUser(req, res, next) {
  try { return success(res, 200, 'SOS alerts retrieved successfully', await service.listAlertsForCareUser(req.user, req.params.id)); }
  catch (err) { return next(err); }
}
async function getAlert(req, res, next) {
  try { return success(res, 200, 'SOS alert retrieved successfully', await service.getAlert(req.user, req.params.alertId)); }
  catch (err) { return next(err); }
}
async function acknowledge(req, res, next) {
  try {
    const result = await service.acknowledgeAlert(req.user.id, req.params.alertId);
    const activity = await logEvent({ actorUserId: req.user.id, careUserId: result.alert && result.alert.careUserId, eventType: 'SOS_ACKNOWLEDGED', entityType: 'sos_alert', entityId: result.alert && result.alert.id, summary: 'SOS alert acknowledged' });
    result.activityLog = activity;
    return success(res, 200, 'SOS alert acknowledged successfully', result);
  }
  catch (err) { return next(err); }
}
async function resolve(req, res, next) {
  try { return success(res, 200, 'SOS alert resolved successfully', await service.resolveAlert(req.user.id, req.params.alertId)); }
  catch (err) { return next(err); }
}

module.exports = { createSos, listForCareUser, getAlert, acknowledge, resolve };
