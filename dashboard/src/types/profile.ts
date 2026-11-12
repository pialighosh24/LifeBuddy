export interface UserProfile {
  id: number;
  role: 'caregiver' | 'user' | string;
  email: string | null;
  fullName: string | null;
  displayName: string | null;
  status: string;
  preferredLanguage: 'en' | 'bn' | string | null;
  phoneNumber: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  displayName?: string | null;
  preferredLanguage?: 'en' | 'bn';
  phoneNumber?: string | null;
}

export interface UserPreferences {
  id: number;
  userId: number;
  language: 'en' | 'bn';
  textSize: 'small' | 'medium' | 'large' | 'xlarge';
  contrastMode: 'normal' | 'high';
  speechRate: number;
  voiceEnabled: boolean;
  reducedMotion: boolean;
  notificationsEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdatePreferencesPayload {
  language?: 'en' | 'bn';
  textSize?: 'small' | 'medium' | 'large' | 'xlarge';
  contrastMode?: 'normal' | 'high';
  speechRate?: number;
  voiceEnabled?: boolean;
  reducedMotion?: boolean;
  notificationsEnabled?: boolean;
}
