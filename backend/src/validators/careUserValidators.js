const { body, param } = require('express-validator');

const createCareUser = [
  body('fullName').isString().trim().isLength({ min: 2, max: 150 }).withMessage('fullName is required'),
  body('displayName').optional().isString().trim().isLength({ max: 100 }),
  body('preferredLanguage').optional().isIn(['en', 'bn']).withMessage('preferredLanguage must be en or bn'),
  body('phoneNumber').optional().isString().trim().isLength({ max: 30 }),
  body('relationshipType').optional().isString().trim().isLength({ max: 50 }),
];

const careUserIdParam = [
  param('id').isInt({ min: 1 }).toInt().withMessage('Valid care-user id is required'),
];

const updateCareUser = [
  ...careUserIdParam,
  body('fullName').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('displayName').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('preferredLanguage').optional().isIn(['en', 'bn']),
  body('phoneNumber').optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
  body('status').optional().isIn(['active', 'inactive']),
];

const setCareUserPin = [
  ...careUserIdParam,
  body('pin').isString().matches(/^\d{4,8}$/).withMessage('PIN must be 4-8 digits'),
  body('fullName').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('displayName').optional().isString().trim().isLength({ max: 100 }),
  body('preferredLanguage').optional().isIn(['en', 'bn']),
];

module.exports = { createCareUser, careUserIdParam, updateCareUser, setCareUserPin };
