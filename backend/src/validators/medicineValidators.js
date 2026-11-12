const { body, param } = require('express-validator');

const careUserIdParam = [param('id').isInt({ min: 1 }).toInt().withMessage('Valid care-user id is required')];
const medicineIdParam = [param('medicineId').isInt({ min: 1 }).toInt().withMessage('Valid medicine id is required')];
const reminderIdParam = [param('reminderId').isInt({ min: 1 }).toInt().withMessage('Valid reminder id is required')];

const createMedicine = [
  ...careUserIdParam,
  body('medicineName').isString().trim().isLength({ min: 1, max: 150 }).withMessage('medicineName is required'),
  body('prescribedInstructions').optional({ nullable: true }).isString(),
  body('notes').optional({ nullable: true }).isString(),
  body('startDate').optional({ nullable: true }).isISO8601({ strict: false }).withMessage('startDate must be a valid date'),
  body('endDate').optional({ nullable: true }).isISO8601({ strict: false }).withMessage('endDate must be a valid date'),
  body('isActive').optional().isBoolean().toBoolean(),
];

const updateMedicine = [
  ...medicineIdParam,
  body('medicineName').optional().isString().trim().isLength({ min: 1, max: 150 }),
  body('prescribedInstructions').optional({ nullable: true }).isString(),
  body('notes').optional({ nullable: true }).isString(),
  body('startDate').optional({ nullable: true }).isISO8601({ strict: false }).withMessage('startDate must be a valid date'),
  body('endDate').optional({ nullable: true }).isISO8601({ strict: false }).withMessage('endDate must be a valid date'),
  body('isActive').optional().isBoolean().toBoolean(),
];

const createReminder = [
  ...medicineIdParam,
  body('reminderTime').matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).withMessage('reminderTime must be HH:MM or HH:MM:SS'),
  body('frequency').optional().isIn(['once', 'daily', 'weekly', 'custom']).withMessage('Invalid frequency'),
  body('daysOfWeek').optional({ nullable: true }).isString().trim().isLength({ max: 20 }).withMessage('daysOfWeek must be a string like MON,TUE'),
  body('reminderLabel').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('isActive').optional().isBoolean().toBoolean(),
];

const updateReminder = [
  ...medicineIdParam,
  ...reminderIdParam,
  body('reminderTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).withMessage('reminderTime must be HH:MM or HH:MM:SS'),
  body('frequency').optional().isIn(['once', 'daily', 'weekly', 'custom']),
  body('daysOfWeek').optional({ nullable: true }).isString().trim().isLength({ max: 20 }),
  body('reminderLabel').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('isActive').optional().isBoolean().toBoolean(),
];

const createLog = [
  ...medicineIdParam,
  body('status').isIn(['taken', 'skipped', 'missed', 'pending']).withMessage('status must be taken, skipped, missed, or pending'),
  body('scheduledFor').isISO8601().withMessage('scheduledFor is required and must be a valid datetime'),
  body('reminderId').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('respondedAt').optional({ nullable: true }).isISO8601().withMessage('respondedAt must be a valid datetime'),
  body('notes').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
];

module.exports = {
  careUserIdParam,
  medicineIdParam,
  reminderIdParam,
  createMedicine,
  updateMedicine,
  createReminder,
  updateReminder,
  createLog,
};
