const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const { validate } = require('../middleware/validate');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const authController = require('../controllers/authController');
const v = require('../validators/authValidators');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: config.security.authRateLimitWindowMs,
  max: config.security.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later', code: 'RATE_LIMITED' },
});

router.post('/caregiver/register', authLimiter, v.caregiverRegister, validate, authController.registerCaregiver);
router.post('/caregiver/login', authLimiter, v.caregiverLogin, validate, authController.loginCaregiver);
router.post('/user/pin-setup', authLimiter, authenticate, authorizeRoles('caregiver'), v.userPinSetup, validate, authController.setupUserPin);
// Suggested endpoint alias + existing path for compatibility
router.post('/user/pin/login', authLimiter, v.userLogin, validate, authController.loginUser);
router.post('/user/login', authLimiter, v.userLogin, validate, authController.loginUser);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
