const service = require('../services/activityLogService');
const { success } = require('../utils/response');

async function listForCareUser(req, res, next) {
  try { return success(res, 200, 'Activity logs retrieved successfully', await service.listForCareUser(req.user, req.params.id, req.query)); }
  catch (err) { return next(err); }
}
async function listForMe(req, res, next) {
  try { return success(res, 200, 'My activity logs retrieved successfully', await service.listForMe(req.user, req.query)); }
  catch (err) { return next(err); }
}

module.exports = { listForCareUser, listForMe };
