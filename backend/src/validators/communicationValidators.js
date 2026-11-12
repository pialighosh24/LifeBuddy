const { body, param, query } = require('express-validator');

const itemIdParam = [param('itemId').isInt({ min: 1 }).toInt().withMessage('Valid item id is required')];

const createItem = [
  body('itemKey').isString().trim().isLength({ min: 1, max: 60 }).matches(/^[A-Z0-9_]+$/).withMessage('itemKey must be uppercase letters/numbers/underscores'),
  body('category').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('labelEn').isString().trim().isLength({ min: 1, max: 100 }).withMessage('labelEn is required'),
  body('labelBn').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('iconKey').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('speakTextEn').isString().trim().isLength({ min: 1, max: 255 }).withMessage('speakTextEn is required'),
  body('speakTextBn').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('sentenceRole').optional().isIn(['subject', 'object', 'need', 'feeling', 'action', 'modifier', 'yesno', 'other']),
  body('sortOrder').optional().isInt().toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

const updateItem = [
  ...itemIdParam,
  body('category').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('labelEn').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('labelBn').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('iconKey').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('speakTextEn').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('speakTextBn').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('sentenceRole').optional().isIn(['subject', 'object', 'need', 'feeling', 'action', 'modifier', 'yesno', 'other']),
  body('sortOrder').optional().isInt().toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

const listQuery = [
  query('category').optional().isString().trim().isLength({ min: 1, max: 50 }),
  query('language').optional().isIn(['en', 'bn']),
  query('active').optional().isIn(['true', 'false', '1', '0', 'all']),
];

module.exports = { itemIdParam, createItem, updateItem, listQuery };
