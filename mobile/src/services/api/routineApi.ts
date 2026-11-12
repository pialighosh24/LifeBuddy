import { apiRequest } from './client';
import type { ApiSuccess } from '../../types/auth';
import type { Routine, RoutineCompletion, RoutineProgressResponse } from '../../types/routine';

export async function getRoutinesForCareUser(careUserId: number) {
  return apiRequest<ApiSuccess<{ routines: Routine[] }>>(`/care-users/${careUserId}/routines`, {
    method: 'GET',
    auth: true,
  });
}

export async function getRoutineProgress(careUserId: number, date?: string) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest<ApiSuccess<RoutineProgressResponse>>(`/care-users/${careUserId}/routine-progress${qs}`, {
    method: 'GET',
    auth: true,
  });
}

export async function getRoutine(routineId: number) {
  return apiRequest<ApiSuccess<{ routine: Routine; steps: any[] }>>(`/routines/${routineId}`, {
    method: 'GET',
    auth: true,
  });
}

export async function createRoutineCompletion(
  routineId: number,
  payload: {
    routineStepId: number;
    completionStatus?: 'completed' | 'skipped' | 'pending_sync';
    completedAt?: string;
    source?: 'online' | 'offline_sync';
    clientEventId?: string | null;
    notes?: string | null;
  }
) {
  return apiRequest<ApiSuccess<{ completion: RoutineCompletion; idempotent?: boolean }>>(`/routines/${routineId}/completions`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getRoutineCompletions(routineId: number, params?: { date?: string }) {
  const qs = params?.date ? `?date=${encodeURIComponent(params.date)}` : '';
  return apiRequest<ApiSuccess<{ completions: RoutineCompletion[] }>>(`/routines/${routineId}/completions${qs}`, {
    method: 'GET',
    auth: true,
  });
}
