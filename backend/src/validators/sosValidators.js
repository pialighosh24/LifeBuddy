const { body, param } = require('express-validator');

const careUserIdParam = [param('id').isInt({ min: 1 }).toInt().withMessage('Valid care-user id is required')];
const alertIdParam = [param('alertId').isInt({ min: 1 }).toInt().withMessage('Valid alert id is required')];

const createSos = [
  body('latitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90').toFloat(),
  body('longitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180').toFloat(),
  body('locationStatus').optional().isIn(['available', 'unavailable', 'denied', 'disabled']).withMessage('Invalid locationStatus'),
  body('emergencyContactId').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('clientEventId').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 64 }),
];

module.exports = { careUserIdParam, alertIdParam, createSos };
