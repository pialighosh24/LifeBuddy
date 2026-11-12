export interface RoutineStep {
  id: number;
  routineId: number;
  stepOrder: number;
  instructionEn: string;
  instructionBn: string | null;
  imageKey: string | null;
  audioHintKey: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Routine {
  id: number;
  careUserId: number;
  createdByCaregiverId?: number;
  titleEn: string;
  titleBn: string | null;
  descriptionEn: string | null;
  descriptionBn: string | null;
  iconKey: string | null;
  isActive: boolean;
  stepCount?: number;
  steps?: RoutineStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutineProgressItem {
  routineId: number;
  titleEn: string;
  titleBn: string | null;
  isActive: boolean;
  date: string;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  completionRecords: number;
  progressPercent: number;
  status: 'completed' | 'in_progress' | 'not_started' | string;
}

export interface RoutineProgressResponse {
  careUserId: number;
  date: string;
  progress: RoutineProgressItem[];
}

export interface RoutineCompletion {
  id: number;
  routineId: number;
  routineStepId: number;
  careUserId: number;
  completionStatus: 'completed' | 'skipped' | 'pending_sync';
  completedAt: string;
  syncedAt?: string | null;
  source?: 'online' | 'offline_sync';
  clientEventId?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
