import { apiRequest } from './apiClient';
import type { ApiSuccess } from '../types/auth';
import type {
  CreateMedicinePayload, CreateReminderPayload, Medicine, MedicineLog, MedicineReminder,
  UpdateMedicinePayload, UpdateReminderPayload
} from '../types/medicine';

export async function listMedicines(careUserId: number) {
  return apiRequest<ApiSuccess<{ medicines: Medicine[] }>>(`/care-users/${careUserId}/medicines`, { method: 'GET', auth: true });
}

export async function getMedicineHistory(careUserId: number) {
  return apiRequest<ApiSuccess<{ careUserId: number; history: MedicineLog[] }>>(`/care-users/${careUserId}/medicine-history`, { method: 'GET', auth: true });
}

export async function createMedicine(careUserId: number, payload: CreateMedicinePayload) {
  return apiRequest<ApiSuccess<{ medicine: Medicine }>>(`/care-users/${careUserId}/medicines`, {
    method: 'POST', auth: true, body: JSON.stringify(payload),
  });
}

export async function getMedicine(medicineId: number) {
  return apiRequest<ApiSuccess<{ medicine: Medicine; reminders: MedicineReminder[] }>>(`/medicines/${medicineId}`, { method: 'GET', auth: true });
}

export async function updateMedicine(medicineId: number, payload: UpdateMedicinePayload) {
  return apiRequest<ApiSuccess<{ medicine: Medicine }>>(`/medicines/${medicineId}`, {
    method: 'PATCH', auth: true, body: JSON.stringify(payload),
  });
}

// default: deactivate; hard=true deletes (cascades reminders/logs per backend/schema)
export async function deleteOrDeactivateMedicine(medicineId: number, hard: boolean) {
  const qs = hard ? '?hard=true' : '';
  return apiRequest<ApiSuccess<{ deletedMedicineId?: number; medicine?: Medicine }>>(`/medicines/${medicineId}${qs}`, {
    method: 'DELETE', auth: true,
  });
}

export async function listMedicineReminders(medicineId: number) {
  return apiRequest<ApiSuccess<{ reminders: MedicineReminder[] }>>(`/medicines/${medicineId}/reminders`, { method: 'GET', auth: true });
}

export async function createMedicineReminder(medicineId: number, payload: CreateReminderPayload) {
  return apiRequest<ApiSuccess<{ reminder: MedicineReminder }>>(`/medicines/${medicineId}/reminders`, {
    method: 'POST', auth: true, body: JSON.stringify(payload),
  });
}

export async function updateMedicineReminder(medicineId: number, reminderId: number, payload: UpdateReminderPayload) {
  return apiRequest<ApiSuccess<{ reminder: MedicineReminder }>>(`/medicines/${medicineId}/reminders/${reminderId}`, {
    method: 'PATCH', auth: true, body: JSON.stringify(payload),
  });
}

// default: hard delete; deactivate=true soft-deactivates
export async function deleteOrDeactivateReminder(medicineId: number, reminderId: number, deactivateOnly: boolean) {
  const qs = deactivateOnly ? '?deactivate=true' : '';
  return apiRequest<ApiSuccess<{ deletedReminderId?: number; reminder?: MedicineReminder }>>(`/medicines/${medicineId}/reminders/${reminderId}${qs}`, {
    method: 'DELETE', auth: true,
  });
}

export async function getMedicineLogs(medicineId: number) {
  return apiRequest<ApiSuccess<{ logs: MedicineLog[] }>>(`/medicines/${medicineId}/logs`, { method: 'GET', auth: true });
}
