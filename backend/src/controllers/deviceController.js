const service = require('../services/deviceService');
const { success } = require('../utils/response');

async function register(req, res, next) {
  try { return success(res, 201, 'Device token registered successfully', await service.registerDevice(req.user.id, req.body)); }
  catch (err) { return next(err); }
}
async function list(req, res, next) {
  try { return success(res, 200, 'Devices retrieved successfully', await service.listDevices(req.user.id)); }
  catch (err) { return next(err); }
}
async function unregister(req, res, next) {
  try { return success(res, 200, 'Device unregistered successfully', await service.unregisterDevice(req.user.id, req.params.deviceId)); }
  catch (err) { return next(err); }
}

module.exports = { register, list, unregister };
