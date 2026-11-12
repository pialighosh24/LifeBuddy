const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/deviceController');
const v = require('../validators/deviceValidators');

const router = express.Router();
router.use(authenticate);

router.post('/register', v.registerDevice, validate, ctrl.register);
router.get('/', ctrl.list);
router.delete('/:deviceId', v.deviceIdParam, validate, ctrl.unregister);

module.exports = router;
