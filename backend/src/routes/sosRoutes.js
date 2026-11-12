const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/sosController');
const v = require('../validators/sosValidators');

const router = express.Router();
router.use(authenticate);

router.post('/', authorizeRoles('user'), v.createSos, validate, ctrl.createSos);
router.get('/:alertId', v.alertIdParam, validate, ctrl.getAlert);
router.patch('/:alertId/acknowledge', authorizeRoles('caregiver'), v.alertIdParam, validate, ctrl.acknowledge);
router.patch('/:alertId/resolve', authorizeRoles('caregiver'), v.alertIdParam, validate, ctrl.resolve);

module.exports = router;
