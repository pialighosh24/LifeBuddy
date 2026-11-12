const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/routineController');
const v = require('../validators/routineValidators');

const router = express.Router();

router.use(authenticate);

// Routine read (care-user self or linked caregiver) / manage (caregiver linked)
router.get('/:routineId', v.routineIdParam, validate, ctrl.getRoutine);
router.patch('/:routineId', authorizeRoles('caregiver'), v.updateRoutine, validate, ctrl.updateRoutine);
router.delete('/:routineId', authorizeRoles('caregiver'), v.routineIdParam, validate, ctrl.deleteRoutine);

router.post('/:routineId/steps', authorizeRoles('caregiver'), v.addStep, validate, ctrl.addStep);
router.patch('/:routineId/steps/reorder', authorizeRoles('caregiver'), v.reorderSteps, validate, ctrl.reorderSteps);
router.patch('/:routineId/steps/:stepId', authorizeRoles('caregiver'), v.updateStep, validate, ctrl.updateStep);
router.delete('/:routineId/steps/:stepId', authorizeRoles('caregiver'), [...v.routineIdParam, ...v.stepIdParam], validate, ctrl.deleteStep);

router.post('/:routineId/completions', v.createCompletion, validate, ctrl.createCompletion);
router.get('/:routineId/completions', v.routineIdParam, validate, ctrl.getCompletions);

module.exports = router;
