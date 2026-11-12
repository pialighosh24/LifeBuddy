const service = require('../services/situationService');
const { success } = require('../utils/response');

async function listSituations(req, res, next) {
  try {
    // authenticated users can list; if care-user, can include own custom; caregivers not tied to specific user here
    const careUserId = req.user.role === 'user' ? req.user.id : null;
    const result = await service.listSituations({ careUserId, includeInactive: req.query.active === 'all' });
    return success(res, 200, 'Situations retrieved successfully', result);
  } catch (err) { return next(err); }
}

async function getSituation(req, res, next) {
  try {
    const careUserId = req.user.role === 'user' ? req.user.id : null;
    const result = await service.getSituation(req.params.situationKey, { careUserId, includeInactive: req.query.active === 'all' });
    return success(res, 200, 'Situation retrieved successfully', result);
  } catch (err) { return next(err); }
}

async function getSituationSteps(req, res, next) {
  try {
    const careUserId = req.user.role === 'user' ? req.user.id : null;
    const result = await service.getSituation(req.params.situationKey, { careUserId, includeInactive: req.query.active === 'all' });
    return success(res, 200, 'Situation steps retrieved successfully', { situationKey: req.params.situationKey, steps: result.steps });
  } catch (err) { return next(err); }
}

module.exports = { listSituations, getSituation, getSituationSteps };
