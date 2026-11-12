import { apiRequest } from './client';
import type { ApiSuccess } from '../../types/auth';
import type { FavouritePhrase } from '../../types/communication';

export interface CreateFavouritePayload {
  communicationItemId?: number | null;
  phraseEn?: string;
  phraseBn?: string | null;
  phraseLabel?: string | null;
  selectedItemKeys?: string[] | null;
}

export async function getFavourites(careUserId: number) {
  return apiRequest<ApiSuccess<{ favourites: FavouritePhrase[] }>>(`/care-users/${careUserId}/favourites`, {
    method: 'GET',
    auth: true,
  });
}

export async function addFavourite(careUserId: number, payload: CreateFavouritePayload) {
  return apiRequest<ApiSuccess<{ favourite: FavouritePhrase }>>(`/care-users/${careUserId}/favourites`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function removeFavourite(favouriteId: number) {
  return apiRequest<ApiSuccess<{ favourite: FavouritePhrase }>>(`/favourites/${favouriteId}`, {
    method: 'DELETE',
    auth: true,
  });
}
