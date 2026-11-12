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

export interface RoutineCompletion {
  id: number;
  routineId: number;
  routineStepId: number;
  careUserId: number;
  completionStatus: 'completed' | 'skipped' | 'pending_sync' | string;
  completedAt: string;
  syncedAt?: string | null;
  source?: 'online' | 'offline_sync' | string;
  clientEventId?: string | null;
  notes?: string | null;
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
  status: string;
}

export interface RoutineProgressResponse {
  careUserId: number;
  date: string;
  progress: RoutineProgressItem[];
}

export interface CreateRoutinePayload {
  titleEn: string;
  titleBn?: string | null;
  descriptionEn?: string | null;
  descriptionBn?: string | null;
  iconKey?: string | null;
  isActive?: boolean;
  steps?: Array<{ instructionEn: string; instructionBn?: string | null; imageKey?: string | null; audioHintKey?: string | null }>;
}

export interface UpdateRoutinePayload {
  titleEn?: string;
  titleBn?: string | null;
  descriptionEn?: string | null;
  descriptionBn?: string | null;
  iconKey?: string | null;
  isActive?: boolean;
}

export interface CreateStepPayload {
  instructionEn: string;
  instructionBn?: string | null;
  imageKey?: string | null;
  audioHintKey?: string | null;
  stepOrder?: number;
}

export interface UpdateStepPayload {
  instructionEn?: string;
  instructionBn?: string | null;
  imageKey?: string | null;
  audioHintKey?: string | null;
  stepOrder?: number;
}
