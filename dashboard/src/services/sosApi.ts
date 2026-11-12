import { apiRequest } from './apiClient';
import type { ApiSuccess } from '../types/auth';
import type { SosAlert } from '../types/sos';

export async function listSosAlerts(careUserId: number) {
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

export async function acknowledgeSosAlert(alertId: number) {
  return apiRequest<ApiSuccess<{ alert: SosAlert; activityLog?: unknown }>>(`/sos/${alertId}/acknowledge`, {
    method: 'PATCH',
    auth: true,
  });
}
