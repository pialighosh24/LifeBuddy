const medicineService = require('../services/medicineService');
const { success } = require('../utils/response');
const { logEvent } = require('../services/activityLogService');

async function createMedicine(req, res, next) {
  try { return success(res, 201, 'Medicine created successfully', await medicineService.createMedicine(req.user.id, req.params.id, req.body)); }
  catch (err) { return next(err); }
}
async function listMedicines(req, res, next) {
  try { return success(res, 200, 'Medicines retrieved successfully', await medicineService.listMedicines(req.user, req.params.id)); }
  catch (err) { return next(err); }
}
async function getMedicine(req, res, next) {
  try { return success(res, 200, 'Medicine retrieved successfully', await medicineService.getMedicine(req.user, req.params.medicineId)); }
  catch (err) { return next(err); }
}
async function updateMedicine(req, res, next) {
  try { return success(res, 200, 'Medicine updated successfully', await medicineService.updateMedicine(req.user.id, req.params.medicineId, req.body)); }
  catch (err) { return next(err); }
}
async function deleteMedicine(req, res, next) {
  try {
    const hard = req.query && (req.query.hard === 'true' || req.query.hard === '1');
    return success(res, 200, hard ? 'Medicine deleted successfully' : 'Medicine deactivated successfully', await medicineService.deleteOrDeactivateMedicine(req.user.id, req.params.medicineId, { hardDelete: !!hard }));
  } catch (err) { return next(err); }
}
async function createReminder(req, res, next) {
  try { return success(res, 201, 'Reminder created successfully', await medicineService.createReminder(req.user.id, req.params.medicineId, req.body)); }
  catch (err) { return next(err); }
}
async function listReminders(req, res, next) {
  try { return success(res, 200, 'Reminders retrieved successfully', await medicineService.listReminders(req.user, req.params.medicineId)); }
  catch (err) { return next(err); }
}
async function updateReminder(req, res, next) {
  try { return success(res, 200, 'Reminder updated successfully', await medicineService.updateReminder(req.user.id, req.params.medicineId, req.params.reminderId, req.body)); }
  catch (err) { return next(err); }
}
async function deleteReminder(req, res, next) {
  try {
    const hard = !(req.query && (req.query.deactivate === 'true' || req.query.deactivate === '1'));
    return success(res, 200, hard ? 'Reminder deleted successfully' : 'Reminder deactivated successfully', await medicineService.deleteOrDeactivateReminder(req.user.id, req.params.medicineId, req.params.reminderId, { hardDelete: hard }));
  } catch (err) { return next(err); }
}
async function createLog(req, res, next) {
  try {
    const result = await medicineService.createLog(req.user, req.params.medicineId, req.body);
    await logEvent({ actorUserId: req.user.id, careUserId: result.log && result.log.careUserId, eventType: 'MEDICINE_LOG_CREATED', entityType: 'medicine_log', entityId: result.log && result.log.id, summary: `Medicine log recorded (${result.log && result.log.status})` });
    return success(res, 201, 'Medicine log recorded successfully', result);
  }
  catch (err) { return next(err); }
}
async function getMedicineLogs(req, res, next) {
  try { return success(res, 200, 'Medicine logs retrieved successfully', await medicineService.getMedicineLogs(req.user, req.params.medicineId)); }
  catch (err) { return next(err); }
}
async function getMedicineHistory(req, res, next) {
  try { return success(res, 200, 'Medicine history retrieved successfully', await medicineService.getMedicineHistory(req.user, req.params.id)); }
  catch (err) { return next(err); }
}

module.exports = {
  createMedicine, listMedicines, getMedicine, updateMedicine, deleteMedicine,
  createReminder, listReminders, updateReminder, deleteReminder,
  createLog, getMedicineLogs, getMedicineHistory,
};
