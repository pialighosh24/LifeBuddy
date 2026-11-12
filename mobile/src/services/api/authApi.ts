import { apiRequest } from './client';
import type { ApiSuccess, AuthResponseData, AuthUser, CaregiverLoginPayload, UserPinLoginPayload } from '../../types/auth';

export async function loginCaregiver(payload: CaregiverLoginPayload) {
  return apiRequest<ApiSuccess<AuthResponseData>>('/auth/caregiver/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUserWithPin(payload: UserPinLoginPayload) {
  return apiRequest<ApiSuccess<AuthResponseData>>('/auth/user/pin/login', {
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
  // Backend logout is stateless (client should discard token). Call is best-effort.
  return apiRequest<ApiSuccess<null>>('/auth/logout', {
    method: 'POST',
    auth: true,
  });
}
