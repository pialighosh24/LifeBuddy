const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/emergencyContactController');
const v = require('../validators/emergencyContactValidators');

const router = express.Router();
router.use(authenticate);

router.get('/:contactId', v.contactIdParam, validate, ctrl.getContact);
router.patch('/:contactId', authorizeRoles('caregiver'), v.updateContact, validate, ctrl.updateContact);
router.delete('/:contactId', authorizeRoles('caregiver'), v.contactIdParam, validate, ctrl.deleteContact);

module.exports = router;
