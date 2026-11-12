const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/situationController');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.listSituations);
router.get('/:situationKey', ctrl.getSituation);
router.get('/:situationKey/steps', ctrl.getSituationSteps);

module.exports = router;
