const routineService = require('../services/routineService');
const { success } = require('../utils/response');
const { logEvent } = require('../services/activityLogService');

async function createRoutine(req, res, next) {
  try {
    const result = await routineService.createRoutine(req.user.id, req.params.id, req.body);
    return success(res, 201, 'Routine created successfully', result);
  } catch (err) { return next(err); }
}

async function listRoutines(req, res, next) {
  try {
    const result = await routineService.listRoutines(req.user, req.params.id);
    return success(res, 200, 'Routines retrieved successfully', result);
  } catch (err) { return next(err); }
}

async function getRoutine(req, res, next) {
  try {
    const result = await routineService.getRoutine(req.user, req.params.routineId);
    return success(res, 200, 'Routine retrieved successfully', result);
  } catch (err) { return next(err); }
}

async function updateRoutine(req, res, next) {
  try {
    const result = await routineService.updateRoutine(req.user.id, req.params.routineId, req.body);
    return success(res, 200, 'Routine updated successfully', result);
  } catch (err) { return next(err); }
}

async function deleteRoutine(req, res, next) {
  try {
    const result = await routineService.deleteRoutine(req.user.id, req.params.routineId);
    return success(res, 200, 'Routine deleted successfully', result);
  } catch (err) { return next(err); }
}

async function addStep(req, res, next) {
  try {
    const result = await routineService.addStep(req.user.id, req.params.routineId, req.body);
    return success(res, 201, 'Routine step added successfully', result);
  } catch (err) { return next(err); }
}

async function updateStep(req, res, next) {
  try {
    const result = await routineService.updateStep(req.user.id, req.params.routineId, req.params.stepId, req.body);
    return success(res, 200, 'Routine step updated successfully', result);
  } catch (err) { return next(err); }
}

async function deleteStep(req, res, next) {
  try {
    const result = await routineService.deleteStep(req.user.id, req.params.routineId, req.params.stepId);
    return success(res, 200, 'Routine step deleted successfully', result);
  } catch (err) { return next(err); }
}

async function reorderSteps(req, res, next) {
  try {
    const result = await routineService.reorderSteps(req.user.id, req.params.routineId, req.body.orderedStepIds);
    return success(res, 200, 'Routine steps reordered successfully', result);
  } catch (err) { return next(err); }
}

async function createCompletion(req, res, next) {
  try {
    const result = await routineService.createCompletion(req.user, req.params.routineId, req.body);
    await logEvent({ actorUserId: req.user.id, careUserId: result.completion && result.completion.careUserId, eventType: 'ROUTINE_COMPLETION_RECORDED', entityType: 'routine_completion', entityId: result.completion && result.completion.id, summary: 'Routine step completion recorded' });
    return success(res, 201, 'Routine completion recorded successfully', result);
  } catch (err) { return next(err); }
}

async function getCompletions(req, res, next) {
  try {
    const result = await routineService.getCompletions(req.user, req.params.routineId, req.query);
    return success(res, 200, 'Routine completions retrieved successfully', result);
  } catch (err) { return next(err); }
}

async function getRoutineProgress(req, res, next) {
  try {
    const result = await routineService.getRoutineProgress(req.user, req.params.id, req.query);
    return success(res, 200, 'Routine progress retrieved successfully', result);
  } catch (err) { return next(err); }
}

module.exports = {
  createRoutine,
  listRoutines,
  getRoutine,
  updateRoutine,
  deleteRoutine,
  addStep,
  updateStep,
  deleteStep,
  reorderSteps,
  createCompletion,
  getCompletions,
  getRoutineProgress,
};
