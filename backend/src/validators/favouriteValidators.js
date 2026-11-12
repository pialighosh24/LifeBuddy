const { body, param } = require('express-validator');

const careUserIdParam = [param('id').isInt({ min: 1 }).toInt().withMessage('Valid care-user id is required')];
const favouriteIdParam = [param('favouriteId').isInt({ min: 1 }).toInt().withMessage('Valid favourite id is required')];

const createFavourite = [
  ...careUserIdParam,
  body('communicationItemId').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('phraseEn').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 5000 }),
  body('phraseBn').optional({ nullable: true }).isString().trim().isLength({ max: 5000 }),
  body('phraseLabel').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('selectedItemKeys').optional({ nullable: true }).isArray(),
];

module.exports = { careUserIdParam, favouriteIdParam, createFavourite };
