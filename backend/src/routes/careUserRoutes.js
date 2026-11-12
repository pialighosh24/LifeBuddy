const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/careUserController');
const profileCtrl = require('../controllers/profileController');
const routineCtrl = require('../controllers/routineController');
const medicineCtrl = require('../controllers/medicineController');
const emergencyContactCtrl = require('../controllers/emergencyContactController');
const sosCtrl = require('../controllers/sosController');
const favouriteCtrl = require('../controllers/favouriteController');
const activityCtrl = require('../controllers/activityLogController');
const v = require('../validators/careUserValidators');
const pv = require('../validators/profileValidators');
const rv = require('../validators/routineValidators');
const mv = require('../validators/medicineValidators');
const ecv = require('../validators/emergencyContactValidators');
const sosv = require('../validators/sosValidators');
const fv = require('../validators/favouriteValidators');

const router = express.Router();

router.use(authenticate);

// Preferences: accessible by care-user (self) or linked caregiver; ownership enforced in service
router.get('/:id/preferences', pv.careUserIdParam, validate, profileCtrl.getPreferences);
router.put('/:id/preferences', pv.putPreferences, validate, profileCtrl.updatePreferences);

// Routines scoped to care-user (ownership enforced in services/controllers)
router.post('/:id/routines', authorizeRoles('caregiver'), rv.createRoutine, validate, routineCtrl.createRoutine);
router.get('/:id/routines', rv.careUserIdParam, validate, routineCtrl.listRoutines); // care-user self or linked caregiver
router.get('/:id/routine-progress', rv.progressQuery, validate, routineCtrl.getRoutineProgress);

// Medicines scoped to care-user
router.post('/:id/medicines', authorizeRoles('caregiver'), mv.createMedicine, validate, medicineCtrl.createMedicine);
router.get('/:id/medicines', mv.careUserIdParam, validate, medicineCtrl.listMedicines); // self or linked caregiver
router.get('/:id/medicine-history', mv.careUserIdParam, validate, medicineCtrl.getMedicineHistory);

// Emergency contacts scoped to care-user
router.post('/:id/emergency-contacts', authorizeRoles('caregiver'), ecv.createContact, validate, emergencyContactCtrl.createContact);
router.get('/:id/emergency-contacts', ecv.careUserIdParam, validate, emergencyContactCtrl.listContacts); // self or linked caregiver

// SOS alerts for care-user (caregiver linked or self where applicable)
router.get('/:id/sos-alerts', sosv.careUserIdParam, validate, sosCtrl.listForCareUser);
router.get('/:id/sos-history', sosv.careUserIdParam, validate, sosCtrl.listForCareUser);

// Favourite phrases (care-user self manages; linked caregiver may retrieve)
router.post('/:id/favourites', fv.createFavourite, validate, favouriteCtrl.addFavourite);
router.get('/:id/favourites', fv.careUserIdParam, validate, favouriteCtrl.listFavourites);

// Activity logs (care-user self or linked caregiver)
router.get('/:id/activity', ecv.careUserIdParam, validate, activityCtrl.listForCareUser);

// Caregiver-only care-user management
router.post('/', authorizeRoles('caregiver'), v.createCareUser, validate, ctrl.createCareUser);
router.get('/', authorizeRoles('caregiver'), ctrl.listCareUsers);
router.get('/:id', authorizeRoles('caregiver'), v.careUserIdParam, validate, ctrl.getCareUser);
router.patch('/:id', authorizeRoles('caregiver'), v.updateCareUser, validate, ctrl.updateCareUser);
router.post('/:id/pin', authorizeRoles('caregiver'), v.setCareUserPin, validate, ctrl.setCareUserPin);

module.exports = router;
