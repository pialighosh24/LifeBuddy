import { apiRequest } from './apiClient';
import type { ApiSuccess } from '../types/auth';
import type { UpdatePreferencesPayload, UpdateProfilePayload, UserPreferences, UserProfile } from '../types/profile';

export async function getMyProfile() {
  return apiRequest<ApiSuccess<{ profile: UserProfile }>>('/profile', { method: 'GET', auth: true });
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  return apiRequest<ApiSuccess<{ profile: UserProfile }>>('/profile', {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getCareUserPreferences(careUserId: number) {
  return apiRequest<ApiSuccess<{ preferences: UserPreferences }>>(`/care-users/${careUserId}/preferences`, {
    method: 'GET',
    auth: true,
  });
}

export async function updateCareUserPreferences(careUserId: number, payload: UpdatePreferencesPayload) {
  return apiRequest<ApiSuccess<{ preferences: UserPreferences }>>(`/care-users/${careUserId}/preferences`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}
