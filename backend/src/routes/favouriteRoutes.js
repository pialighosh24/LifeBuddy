const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/favouriteController');
const v = require('../validators/favouriteValidators');

const router = express.Router();
router.use(authenticate, authorizeRoles('user')); // care-user manages own favourites via this route
router.delete('/:favouriteId', v.favouriteIdParam, validate, ctrl.removeFavourite);

module.exports = router;
