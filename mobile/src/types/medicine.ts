export interface MedicineReminder {
  id: number;
  medicineId: number;
  reminderTime: string; // HH:MM:SS
  frequency: 'once' | 'daily' | 'weekly' | 'custom' | string;
  daysOfWeek: string | null; // e.g. MON,TUE
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
