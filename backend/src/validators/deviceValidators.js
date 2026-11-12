const { body, param } = require('express-validator');

const registerDevice = [
  body('expoPushToken').isString().trim().isLength({ min: 10, max: 255 }).withMessage('expoPushToken is required'),
  body('platform').optional().isIn(['android', 'ios', 'web']).withMessage('platform must be android, ios, or web'),
];

const deviceIdParam = [param('deviceId').isInt({ min: 1 }).toInt().withMessage('Valid device id is required')];

module.exports = { registerDevice, deviceIdParam };
