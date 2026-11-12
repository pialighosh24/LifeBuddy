import { apiRequest } from './apiClient';
import type { ApiSuccess, AuthResponseData, AuthUser } from '../types/auth';

export async function loginCaregiver(payload: { email: string; password: string }) {
  return apiRequest<ApiSuccess<AuthResponseData>>('/auth/caregiver/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return apiRequest<ApiSuccess<{ user: AuthUser }>>('/auth/me', {
    method: 'GET',
    auth: true,
  });
}

export async function logout() {
  return apiRequest<ApiSuccess<null>>('/auth/logout', {
    method: 'POST',
    auth: true,
  });
}
