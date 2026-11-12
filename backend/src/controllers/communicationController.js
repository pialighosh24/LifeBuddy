const service = require('../services/communicationService');
const { success } = require('../utils/response');

async function listItems(req, res, next) {
  try { return success(res, 200, 'Communication items retrieved successfully', await service.listItems(req.query)); }
  catch (err) { return next(err); }
}
async function getCategories(req, res, next) {
  try { return success(res, 200, 'Communication categories retrieved successfully', await service.getCategories()); }
  catch (err) { return next(err); }
}
async function getItem(req, res, next) {
  try { return success(res, 200, 'Communication item retrieved successfully', await service.getItem(req.params.itemId)); }
  catch (err) { return next(err); }
}
async function createItem(req, res, next) {
  try { return success(res, 201, 'Communication item created successfully', await service.createItem(req.body)); }
  catch (err) { return next(err); }
}
async function updateItem(req, res, next) {
  try { return success(res, 200, 'Communication item updated successfully', await service.updateItem(req.params.itemId, req.body)); }
  catch (err) { return next(err); }
}
async function deleteItem(req, res, next) {
  try { return success(res, 200, 'Communication item deactivated successfully', await service.deactivateItem(req.params.itemId)); }
  catch (err) { return next(err); }
}

module.exports = { listItems, getCategories, getItem, createItem, updateItem, deleteItem };
