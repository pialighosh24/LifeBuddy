const { body } = require('express-validator');

const caregiverRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').isString().trim().isLength({ min: 2, max: 150 }).withMessage('fullName is required'),
  body('displayName').optional().isString().trim().isLength({ max: 100 }),
  body('preferredLanguage').optional().isIn(['en', 'bn']).withMessage('preferredLanguage must be en or bn'),
  body('phoneNumber').optional().isString().trim().isLength({ max: 30 }),
];

const caregiverLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

const userPinSetup = [
  body('careUserId').isInt({ min: 1 }).toInt().withMessage('careUserId is required'),
  body('pin').isString().matches(/^\d{4,8}$/).withMessage('PIN must be 4-8 digits'),
  body('fullName').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('displayName').optional().isString().trim().isLength({ max: 100 }),
  body('preferredLanguage').optional().isIn(['en', 'bn']),
];

const userLogin = [
  body('careUserId').isInt({ min: 1 }).toInt().withMessage('careUserId is required'),
  body('pin').isString().matches(/^\d{4,8}$/).withMessage('PIN must be 4-8 digits'),
];

module.exports = { caregiverRegister, caregiverLogin, userPinSetup, userLogin };
