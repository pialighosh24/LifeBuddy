import { apiRequest } from './client';
import type { ApiSuccess } from '../../types/auth';
import type { Medicine, MedicineLog, MedicineReminder } from '../../types/medicine';

export async function getMedicinesForCareUser(careUserId: number) {
  return apiRequest<ApiSuccess<{ medicines: Medicine[] }>>(`/care-users/${careUserId}/medicines`, {
    method: 'GET',
    auth: true,
  });
}

export async function getMedicineHistory(careUserId: number) {
  return apiRequest<ApiSuccess<{ careUserId: number; history: MedicineLog[] }>>(`/care-users/${careUserId}/medicine-history`, {
    method: 'GET',
    auth: true,
  });
}

export async function getMedicine(medicineId: number) {
  return apiRequest<ApiSuccess<{ medicine: Medicine; reminders: MedicineReminder[] }>>(`/medicines/${medicineId}`, {
    method: 'GET',
    auth: true,
  });
}

export async function getMedicineReminders(medicineId: number) {
  return apiRequest<ApiSuccess<{ reminders: MedicineReminder[] }>>(`/medicines/${medicineId}/reminders`, {
    method: 'GET',
    auth: true,
  });
}

export async function getMedicineLogs(medicineId: number) {
  return apiRequest<ApiSuccess<{ logs: MedicineLog[] }>>(`/medicines/${medicineId}/logs`, {
    method: 'GET',
    auth: true,
  });
}

export async function createMedicineLog(
  medicineId: number,
  payload: {
    status: 'taken' | 'skipped' | 'missed' | 'pending';
    scheduledFor: string;
    reminderId?: number | null;
    respondedAt?: string | null;
    notes?: string | null;
  }
) {
  return apiRequest<ApiSuccess<{ log: MedicineLog }>>(`/medicines/${medicineId}/logs`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}
