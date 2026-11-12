export interface EmergencyContact {
  id: number;
  careUserId: number;
  contactName: string;
  relationshipLabel: string | null;
  phoneNumber: string;
  email: string | null;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmergencyContactPayload {
  contactName: string;
  phoneNumber: string;
  relationshipLabel?: string | null;
  email?: string | null;
  isPrimary?: boolean;
}

export interface UpdateEmergencyContactPayload {
  contactName?: string;
  phoneNumber?: string;
  relationshipLabel?: string | null;
  email?: string | null;
  isPrimary?: boolean;
}
