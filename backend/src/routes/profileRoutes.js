const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/profileController');
const v = require('../validators/profileValidators');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.getProfile);
router.patch('/', v.updateProfile, validate, ctrl.updateProfile);

module.exports = router;
