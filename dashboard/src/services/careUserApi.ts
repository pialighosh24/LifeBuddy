import { apiRequest } from './apiClient';
import type { ApiSuccess, CareUser } from '../types/auth';

export interface CreateCareUserPayload {
  fullName: string;
  displayName?: string;
  preferredLanguage?: 'en' | 'bn';
  phoneNumber?: string;
  relationshipType?: string;
}

export interface UpdateCareUserPayload {
  fullName?: string;
  displayName?: string | null;
  preferredLanguage?: 'en' | 'bn';
  phoneNumber?: string | null;
  status?: 'active' | 'inactive';
}

export async function getLinkedCareUsers() {
  return apiRequest<ApiSuccess<{ careUsers: CareUser[] }>>('/care-users', {
    method: 'GET',
    auth: true,
  });
}

export async function getCareUser(id: number) {
  return apiRequest<ApiSuccess<{ careUser: CareUser }>>(`/care-users/${id}`, {
    method: 'GET',
    auth: true,
  });
}

export async function createCareUser(payload: CreateCareUserPayload) {
  return apiRequest<ApiSuccess<{ careUser: CareUser }>>('/care-users', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateCareUser(id: number, payload: UpdateCareUserPayload) {
  return apiRequest<ApiSuccess<{ careUser: CareUser }>>(`/care-users/${id}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function setCareUserPin(id: number, pin: string) {
  return apiRequest<ApiSuccess<{ careUser: CareUser }>>(`/care-users/${id}/pin`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ pin }),
  });
}

