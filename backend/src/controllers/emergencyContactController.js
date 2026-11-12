const service = require('../services/emergencyContactService');
const { success } = require('../utils/response');
const { logEvent } = require('../services/activityLogService');

async function createContact(req, res, next) {
  try {
    const result = await service.createContact(req.user.id, req.params.id, req.body);
    await logEvent({ actorUserId: req.user.id, careUserId: Number(req.params.id), eventType: 'EMERGENCY_CONTACT_CREATED', entityType: 'emergency_contact', entityId: result.contact && result.contact.id, summary: 'Emergency contact created' });
    return success(res, 201, 'Emergency contact created successfully', result);
  }
  catch (err) { return next(err); }
}
async function listContacts(req, res, next) {
  try { return success(res, 200, 'Emergency contacts retrieved successfully', await service.listContacts(req.user, req.params.id)); }
  catch (err) { return next(err); }
}
async function getContact(req, res, next) {
  try { return success(res, 200, 'Emergency contact retrieved successfully', await service.getContact(req.user, req.params.contactId)); }
  catch (err) { return next(err); }
}
async function updateContact(req, res, next) {
  try {
    const result = await service.updateContact(req.user.id, req.params.contactId, req.body);
    await logEvent({ actorUserId: req.user.id, careUserId: result.contact && result.contact.careUserId, eventType: 'EMERGENCY_CONTACT_UPDATED', entityType: 'emergency_contact', entityId: result.contact && result.contact.id, summary: 'Emergency contact updated' });
    return success(res, 200, 'Emergency contact updated successfully', result);
  }
  catch (err) { return next(err); }
}
async function deleteContact(req, res, next) {
  try {
    const result = await service.deleteContact(req.user.id, req.params.contactId);
    await logEvent({ actorUserId: req.user.id, careUserId: result.careUserId || null, eventType: 'EMERGENCY_CONTACT_DELETED', entityType: 'emergency_contact', entityId: result.deletedContactId, summary: 'Emergency contact deleted' });
    return success(res, 200, 'Emergency contact deleted successfully', result);
  }
  catch (err) { return next(err); }
}

module.exports = { createContact, listContacts, getContact, updateContact, deleteContact };
