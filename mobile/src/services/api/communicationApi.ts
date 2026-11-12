import { apiRequest } from './client';
import type { ApiSuccess } from '../../types/auth';
import type { CommunicationItem, CommunicationCategory } from '../../types/communication';

export async function getCommunicationItems(params?: { category?: string; active?: 'true' | 'false' | 'all' }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.active) qs.set('active', params.active);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<ApiSuccess<{ items: CommunicationItem[] }>>(`/communication-items${suffix}`, {
    method: 'GET',
    auth: true,
  });
}

export async function getCommunicationCategories() {
  return apiRequest<ApiSuccess<{ categories: CommunicationCategory[] }>>('/communication-items/categories', {
    method: 'GET',
    auth: true,
  });
}

export async function getCommunicationItem(itemId: number) {
  return apiRequest<ApiSuccess<{ item: CommunicationItem }>>(`/communication-items/${itemId}`, {
    method: 'GET',
    auth: true,
  });
}
