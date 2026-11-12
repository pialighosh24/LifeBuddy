const { body, param } = require('express-validator');

const updateProfile = [
  body('fullName').optional().isString().trim().isLength({ min: 2, max: 150 }).withMessage('fullName must be 2-150 characters'),
  body('displayName').optional({ nullable: true }).isString().trim().isLength({ max: 100 }).withMessage('displayName must be at most 100 characters'),
  body('preferredLanguage').optional().isIn(['en', 'bn']).withMessage('preferredLanguage must be en or bn'),
  body('phoneNumber').optional({ nullable: true }).isString().trim().isLength({ max: 30 }).withMessage('phoneNumber must be at most 30 characters'),
];

const careUserIdParam = [
  param('id').isInt({ min: 1 }).toInt().withMessage('Valid care-user id is required'),
];

const putPreferences = [
  ...careUserIdParam,
  body('language').optional().isIn(['en', 'bn']).withMessage('language must be en or bn'),
  body('textSize').optional().isIn(['small', 'medium', 'large', 'xlarge']).withMessage('textSize must be small, medium, large, or xlarge'),
  body('contrastMode').optional().isIn(['normal', 'high']).withMessage('contrastMode must be normal or high'),
  body('speechRate').optional().isFloat({ min: 0.5, max: 2.0 }).withMessage('speechRate must be between 0.50 and 2.00'),
  body('voiceEnabled').optional().isBoolean().withMessage('voiceEnabled must be boolean').toBoolean(),
  body('reducedMotion').optional().isBoolean().withMessage('reducedMotion must be boolean').toBoolean(),
  body('notificationsEnabled').optional().isBoolean().withMessage('notificationsEnabled must be boolean').toBoolean(),
];

module.exports = { updateProfile, careUserIdParam, putPreferences };
