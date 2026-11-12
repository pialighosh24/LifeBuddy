export type UserRole = 'caregiver' | 'user';

export interface AuthUser {
  id: number;
  role: UserRole;
  email?: string | null;
  fullName?: string | null;
  displayName?: string | null;
  preferredLanguage?: 'en' | 'bn' | string | null;
  phoneNumber?: string | null;
  status?: string;
}

export interface AuthResponseData {
  token: string;
  user: AuthUser;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code?: string;
  errors?: Array<{ field?: string; message?: string; value?: unknown } | string>;
}

export interface CaregiverLoginPayload {
  email: string;
  password: string;
}

export interface UserPinLoginPayload {
  careUserId: number;
  pin: string;
}
