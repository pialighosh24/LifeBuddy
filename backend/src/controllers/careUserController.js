const careUserService = require('../services/careUserService');
const { success } = require('../utils/response');

async function createCareUser(req, res, next) {
  try {
    const result = await careUserService.createCareUser({
      caregiverId: req.user.id,
      ...req.body,
    });
    return success(res, 201, 'Care-user created and linked successfully', result);
  } catch (err) { return next(err); }
}

async function listCareUsers(req, res, next) {
  try {
    const careUsers = await careUserService.listLinkedCareUsers(req.user.id);
    return success(res, 200, 'Linked care-users retrieved successfully', { careUsers });
  } catch (err) { return next(err); }
}

async function getCareUser(req, res, next) {
  try {
    const result = await careUserService.getLinkedCareUser(req.user.id, req.params.id);
    return success(res, 200, 'Care-user retrieved successfully', result);
  } catch (err) { return next(err); }
}

async function updateCareUser(req, res, next) {
  try {
    const result = await careUserService.updateLinkedCareUser(req.user.id, req.params.id, req.body);
    return success(res, 200, 'Care-user updated successfully', result);
  } catch (err) { return next(err); }
}

async function setCareUserPin(req, res, next) {
  try {
    const result = await careUserService.setCareUserPin({
      caregiverId: req.user.id,
      careUserId: req.params.id,
      pin: req.body.pin,
      fullName: req.body.fullName,
      displayName: req.body.displayName,
      preferredLanguage: req.body.preferredLanguage,
    });
    return success(res, 200, 'Care-user PIN set successfully', result);
  } catch (err) { return next(err); }
}

module.exports = { createCareUser, listCareUsers, getCareUser, updateCareUser, setCareUserPin };
