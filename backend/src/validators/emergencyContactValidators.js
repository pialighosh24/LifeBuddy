const { body, param } = require('express-validator');

const careUserIdParam = [param('id').isInt({ min: 1 }).toInt().withMessage('Valid care-user id is required')];
const contactIdParam = [param('contactId').isInt({ min: 1 }).toInt().withMessage('Valid contact id is required')];

const createContact = [
  ...careUserIdParam,
  body('contactName').isString().trim().isLength({ min: 1, max: 150 }).withMessage('contactName is required'),
  body('relationshipLabel').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body('phoneNumber').isString().trim().matches(/^[0-9+\-() ]{6,30}$/).withMessage('Valid phoneNumber is required'),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail().withMessage('email must be valid'),
  body('isPrimary').optional().isBoolean().toBoolean(),
];

const updateContact = [
  ...contactIdParam,
  body('contactName').optional().isString().trim().isLength({ min: 1, max: 150 }),
  body('relationshipLabel').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body('phoneNumber').optional().isString().trim().matches(/^[0-9+\-() ]{6,30}$/).withMessage('phoneNumber must be valid'),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail().withMessage('email must be valid'),
  body('isPrimary').optional().isBoolean().toBoolean(),
];

module.exports = { careUserIdParam, contactIdParam, createContact, updateContact };
