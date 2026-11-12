export type UserRole = 'caregiver' | 'user';

export interface AuthUser {
  id: number;
  role: UserRole;
  email?: string | null;
  fullName?: string | null;
  displayName?: string | null;
  preferredLanguage?: string | null;
  phoneNumber?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface CareUser {
  id: number;
  role: 'user';
  email: string | null;
  fullName: string | null;
  displayName: string | null;
  status: string;
  preferredLanguage: string | null;
  phoneNumber: string | null;
  createdAt?: string;
  updatedAt?: string;
  link?: {
    relationshipType: string | null;
    linkStatus: string;
    linkedAt?: string;
  };
}
