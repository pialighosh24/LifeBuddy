const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/medicineController');
const v = require('../validators/medicineValidators');

const router = express.Router();
router.use(authenticate);

router.get('/:medicineId', v.medicineIdParam, validate, ctrl.getMedicine);
router.patch('/:medicineId', authorizeRoles('caregiver'), v.updateMedicine, validate, ctrl.updateMedicine);
router.delete('/:medicineId', authorizeRoles('caregiver'), v.medicineIdParam, validate, ctrl.deleteMedicine);

router.post('/:medicineId/reminders', authorizeRoles('caregiver'), v.createReminder, validate, ctrl.createReminder);
router.get('/:medicineId/reminders', v.medicineIdParam, validate, ctrl.listReminders);
router.patch('/:medicineId/reminders/:reminderId', authorizeRoles('caregiver'), v.updateReminder, validate, ctrl.updateReminder);
router.delete('/:medicineId/reminders/:reminderId', authorizeRoles('caregiver'), [...v.medicineIdParam, ...v.reminderIdParam], validate, ctrl.deleteReminder);

router.post('/:medicineId/logs', v.createLog, validate, ctrl.createLog);
router.get('/:medicineId/logs', v.medicineIdParam, validate, ctrl.getMedicineLogs);

module.exports = router;
