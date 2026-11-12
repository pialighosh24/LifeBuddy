const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/communicationController');
const v = require('../validators/communicationValidators');

const router = express.Router();
router.use(authenticate);

router.get('/', v.listQuery, validate, ctrl.listItems);
router.get('/categories', ctrl.getCategories);
router.get('/:itemId', v.itemIdParam, validate, ctrl.getItem);

// Caregiver-managed content operations (global catalog, schema-supported)
router.post('/', authorizeRoles('caregiver'), v.createItem, validate, ctrl.createItem);
router.patch('/:itemId', authorizeRoles('caregiver'), v.updateItem, validate, ctrl.updateItem);
router.delete('/:itemId', authorizeRoles('caregiver'), v.itemIdParam, validate, ctrl.deleteItem);

module.exports = router;
