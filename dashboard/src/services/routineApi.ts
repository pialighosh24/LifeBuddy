import { apiRequest } from './apiClient';
import type { ApiSuccess } from '../types/auth';
import type { CreateRoutinePayload, CreateStepPayload, Routine, RoutineCompletion, RoutineProgressResponse, RoutineStep, UpdateRoutinePayload, UpdateStepPayload } from '../types/routine';

export async function listRoutines(careUserId: number) {
  return apiRequest<ApiSuccess<{ routines: Routine[] }>>(`/care-users/${careUserId}/routines`, { method: 'GET', auth: true });
}

export async function createRoutine(careUserId: number, payload: CreateRoutinePayload) {
  return apiRequest<ApiSuccess<{ routine: Routine; steps: RoutineStep[] }>>(`/care-users/${careUserId}/routines`, {
    method: 'POST', auth: true, body: JSON.stringify(payload),
  });
}

export async function getRoutine(routineId: number) {
  return apiRequest<ApiSuccess<{ routine: Routine; steps: RoutineStep[] }>>(`/routines/${routineId}`, { method: 'GET', auth: true });
}

export async function updateRoutine(routineId: number, payload: UpdateRoutinePayload) {
  return apiRequest<ApiSuccess<{ routine: Routine; steps: RoutineStep[] }>>(`/routines/${routineId}`, {
    method: 'PATCH', auth: true, body: JSON.stringify(payload),
  });
}

export async function deleteRoutine(routineId: number) {
  return apiRequest<ApiSuccess<{ deletedRoutineId: number }>>(`/routines/${routineId}`, { method: 'DELETE', auth: true });
}

export async function addRoutineStep(routineId: number, payload: CreateStepPayload) {
  return apiRequest<ApiSuccess<{ step: RoutineStep }>>(`/routines/${routineId}/steps`, {
    method: 'POST', auth: true, body: JSON.stringify(payload),
  });
}

export async function updateRoutineStep(routineId: number, stepId: number, payload: UpdateStepPayload) {
  return apiRequest<ApiSuccess<{ step: RoutineStep }>>(`/routines/${routineId}/steps/${stepId}`, {
    method: 'PATCH', auth: true, body: JSON.stringify(payload),
  });
}

export async function deleteRoutineStep(routineId: number, stepId: number) {
  return apiRequest<ApiSuccess<{ deletedStepId: number }>>(`/routines/${routineId}/steps/${stepId}`, {
    method: 'DELETE', auth: true,
  });
}

export async function reorderRoutineSteps(routineId: number, orderedStepIds: number[]) {
  return apiRequest<ApiSuccess<{ routine: Routine; steps: RoutineStep[] }>>(`/routines/${routineId}/steps/reorder`, {
    method: 'PATCH', auth: true, body: JSON.stringify({ orderedStepIds }),
  });
}

export async function getRoutineCompletions(routineId: number, params?: { date?: string }) {
  const qs = params?.date ? `?date=${encodeURIComponent(params.date)}` : '';
  return apiRequest<ApiSuccess<{ completions: RoutineCompletion[] }>>(`/routines/${routineId}/completions${qs}`, { method: 'GET', auth: true });
}

export async function getRoutineProgress(careUserId: number, date?: string) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest<ApiSuccess<RoutineProgressResponse>>(`/care-users/${careUserId}/routine-progress${qs}`, { method: 'GET', auth: true });
}
