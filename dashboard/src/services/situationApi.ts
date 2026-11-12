import { apiRequest } from './apiClient';
import type { ApiSuccess } from '../types/auth';
import type { SituationDetail, SituationStep, SituationSummary } from '../types/situation';

export async function listSituations(active: 'all' | 'true' = 'true') {
  const qs = active === 'all' ? '?active=all' : '';
  return apiRequest<ApiSuccess<{ situations: SituationSummary[] }>>(`/situations${qs}`, {
    method: 'GET',
    auth: true,
  });
}

export async function getSituation(situationKey: string) {
  return apiRequest<ApiSuccess<{ situation: SituationDetail; steps: SituationStep[] }>>(
    `/situations/${encodeURIComponent(situationKey)}`,
    { method: 'GET', auth: true }
  );
}

export async function getSituationSteps(situationKey: string) {
  return apiRequest<ApiSuccess<{ situationKey: string; steps: SituationStep[] }>>(
    `/situations/${encodeURIComponent(situationKey)}/steps`,
    { method: 'GET', auth: true }
  );
}
