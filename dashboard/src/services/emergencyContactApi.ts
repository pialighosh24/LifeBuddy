import { apiRequest } from './apiClient';
import type { ApiSuccess } from '../types/auth';
import type { CreateEmergencyContactPayload, EmergencyContact, UpdateEmergencyContactPayload } from '../types/emergencyContact';

export async function listEmergencyContacts(careUserId: number) {
  return apiRequest<ApiSuccess<{ contacts: EmergencyContact[] }>>(`/care-users/${careUserId}/emergency-contacts`, {
    method: 'GET',
    auth: true,
  });
}

export async function createEmergencyContact(careUserId: number, payload: CreateEmergencyContactPayload) {
  return apiRequest<ApiSuccess<{ contact: EmergencyContact }>>(`/care-users/${careUserId}/emergency-contacts`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getEmergencyContact(contactId: number) {
  return apiRequest<ApiSuccess<{ contact: EmergencyContact }>>(`/emergency-contacts/${contactId}`, {
    method: 'GET',
    auth: true,
  });
}

export async function updateEmergencyContact(contactId: number, payload: UpdateEmergencyContactPayload) {
  return apiRequest<ApiSuccess<{ contact: EmergencyContact }>>(`/emergency-contacts/${contactId}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function deleteEmergencyContact(contactId: number) {
  return apiRequest<ApiSuccess<{ deletedContactId: number; careUserId?: number }>>(`/emergency-contacts/${contactId}`, {
    method: 'DELETE',
    auth: true,
  });
}
