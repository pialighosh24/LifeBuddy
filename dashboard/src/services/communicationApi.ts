import { apiRequest } from './apiClient';
import type { ApiSuccess } from '../types/auth';
import type {
  CommunicationCategory,
  CommunicationItem,
  CreateCommunicationItemPayload,
  FavouritePhrase,
  UpdateCommunicationItemPayload,
} from '../types/communication';

export async function listCommunicationItems(params?: { category?: string; active?: 'true' | 'false' | 'all' }) {
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

export async function createCommunicationItem(payload: CreateCommunicationItemPayload) {
  return apiRequest<ApiSuccess<{ item: CommunicationItem }>>('/communication-items', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function updateCommunicationItem(itemId: number, payload: UpdateCommunicationItemPayload) {
  return apiRequest<ApiSuccess<{ item: CommunicationItem }>>(`/communication-items/${itemId}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(payload),
  });
}

// DELETE deactivates item (sets is_active=false) per backend
export async function deactivateCommunicationItem(itemId: number) {
  return apiRequest<ApiSuccess<{ item: CommunicationItem }>>(`/communication-items/${itemId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function listFavourites(careUserId: number) {
  return apiRequest<ApiSuccess<{ favourites: FavouritePhrase[] }>>(`/care-users/${careUserId}/favourites`, {
    method: 'GET',
    auth: true,
  });
}
