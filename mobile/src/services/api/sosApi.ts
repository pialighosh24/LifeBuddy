import { apiRequest } from './client';
import type { ApiSuccess } from '../../types/auth';
import type { CreateSosResponseData, EmergencyContact, SosAlert } from '../../types/sos';

export async function createSosAlert(payload: {
  latitude?: number | null;
  longitude?: number | null;
  locationStatus?: 'available' | 'unavailable' | 'denied' | 'disabled';
  emergencyContactId?: number | null;
  clientEventId?: string;
}) {
  // Only include coordinates when both are valid numbers
  const body: Record<string, unknown> = {};
  if (typeof payload.latitude === 'number' && typeof payload.longitude === 'number' && Number.isFinite(payload.latitude) && Number.isFinite(payload.longitude)) {
    body.latitude = payload.latitude;
    body.longitude = payload.longitude;
  }
  if (payload.locationStatus) body.locationStatus = payload.locationStatus;
  if (payload.emergencyContactId != null) body.emergencyContactId = payload.emergencyContactId;
  if (payload.clientEventId) body.clientEventId = payload.clientEventId;

  return apiRequest<ApiSuccess<CreateSosResponseData>>('/sos', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function getCareUserSosAlerts(careUserId: number) {
  return apiRequest<ApiSuccess<{ alerts: SosAlert[] }>>(`/care-users/${careUserId}/sos-alerts`, {
    method: 'GET',
    auth: true,
  });
}

export async function getSosAlert(alertId: number) {
  return apiRequest<ApiSuccess<{ alert: SosAlert }>>(`/sos/${alertId}`, {
    method: 'GET',
    auth: true,
  });
}

export async function getEmergencyContacts(careUserId: number) {
  return apiRequest<ApiSuccess<{ contacts: EmergencyContact[] }>>(`/care-users/${careUserId}/emergency-contacts`, {
    method: 'GET',
    auth: true,
  });
}
