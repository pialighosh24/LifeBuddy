const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/activityLogController');

const router = express.Router();
router.use(authenticate);
router.get('/me', ctrl.listForMe);
module.exports = router;
