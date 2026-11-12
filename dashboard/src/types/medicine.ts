export interface MedicineReminder {
  id: number;
  medicineId: number;
  reminderTime: string; // HH:MM or HH:MM:SS
  frequency: 'once' | 'daily' | 'weekly' | 'custom' | string;
  daysOfWeek: string | null;
  reminderLabel: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Medicine {
  id: number;
  careUserId: number;
  createdByCaregiverId?: number;
  medicineName: string;
  prescribedInstructions: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  reminders?: MedicineReminder[];
}

export interface MedicineLog {
  id: number;
  medicineId: number;
  reminderId: number | null;
  careUserId: number;
  scheduledFor: string;
  status: 'taken' | 'skipped' | 'missed' | 'pending' | string;
  respondedAt: string | null;
  notes: string | null;
  medicineName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMedicinePayload {
  medicineName: string;
  prescribedInstructions?: string | null;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}

export interface UpdateMedicinePayload {
  medicineName?: string;
  prescribedInstructions?: string | null;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}

export interface CreateReminderPayload {
  reminderTime: string;
  frequency?: 'once' | 'daily' | 'weekly' | 'custom';
  daysOfWeek?: string | null;
  reminderLabel?: string | null;
  isActive?: boolean;
}

export interface UpdateReminderPayload {
  reminderTime?: string;
  frequency?: 'once' | 'daily' | 'weekly' | 'custom';
  daysOfWeek?: string | null;
  reminderLabel?: string | null;
  isActive?: boolean;
}
