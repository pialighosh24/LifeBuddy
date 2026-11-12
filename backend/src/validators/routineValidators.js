const { body, param, query } = require('express-validator');

const careUserIdParam = [param('id').isInt({ min: 1 }).toInt().withMessage('Valid care-user id is required')];
const routineIdParam = [param('routineId').isInt({ min: 1 }).toInt().withMessage('Valid routine id is required')];
const stepIdParam = [param('stepId').isInt({ min: 1 }).toInt().withMessage('Valid step id is required')];

const createRoutine = [
  ...careUserIdParam,
  body('titleEn').isString().trim().isLength({ min: 1, max: 150 }).withMessage('titleEn is required'),
  body('titleBn').optional({ nullable: true }).isString().trim().isLength({ max: 150 }),
  body('descriptionEn').optional({ nullable: true }).isString(),
  body('descriptionBn').optional({ nullable: true }).isString(),
  body('iconKey').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body('isActive').optional().isBoolean().toBoolean(),
  body('steps').optional().isArray().withMessage('steps must be an array'),
  body('steps.*.instructionEn').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('steps.*.instructionBn').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('steps.*.imageKey').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('steps.*.audioHintKey').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
];

const updateRoutine = [
  ...routineIdParam,
  body('titleEn').optional().isString().trim().isLength({ min: 1, max: 150 }),
  body('titleBn').optional({ nullable: true }).isString().trim().isLength({ max: 150 }),
  body('descriptionEn').optional({ nullable: true }).isString(),
  body('descriptionBn').optional({ nullable: true }).isString(),
  body('iconKey').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body('isActive').optional().isBoolean().toBoolean(),
];

const addStep = [
  ...routineIdParam,
  body('instructionEn').isString().trim().isLength({ min: 1, max: 255 }).withMessage('instructionEn is required'),
  body('instructionBn').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('imageKey').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('audioHintKey').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('stepOrder').optional().isInt({ min: 1 }).toInt(),
];

const updateStep = [
  ...routineIdParam,
  ...stepIdParam,
  body('instructionEn').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('instructionBn').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('imageKey').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('audioHintKey').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('stepOrder').optional().isInt({ min: 1 }).toInt(),
];

const reorderSteps = [
  ...routineIdParam,
  body('orderedStepIds').isArray({ min: 1 }).withMessage('orderedStepIds must be a non-empty array'),
  body('orderedStepIds.*').isInt({ min: 1 }).toInt().withMessage('orderedStepIds must contain valid step ids'),
];

const createCompletion = [
  ...routineIdParam,
  body('routineStepId').isInt({ min: 1 }).toInt().withMessage('routineStepId is required'),
  body('completionStatus').optional().isIn(['completed', 'skipped', 'pending_sync']).withMessage('Invalid completionStatus'),
  body('completedAt').optional().isISO8601().withMessage('completedAt must be a valid datetime'),
  body('source').optional().isIn(['online', 'offline_sync']),
  body('clientEventId').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 64 }),
  body('notes').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
];

const progressQuery = [
  ...careUserIdParam,
  query('date').optional().isISO8601({ strict: false }).withMessage('date must be a valid date'),
  query('from').optional().isISO8601({ strict: false }).withMessage('from must be a valid date'),
  query('to').optional().isISO8601({ strict: false }).withMessage('to must be a valid date'),
];

module.exports = {
  careUserIdParam,
  routineIdParam,
  stepIdParam,
  createRoutine,
  updateRoutine,
  addStep,
  updateStep,
  reorderSteps,
  createCompletion,
  progressQuery,
};
