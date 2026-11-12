import type { ApiErrorBody } from '../types/auth';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '');
export const API_PREFIX = '/api/v1';
export const API_URL = `${API_BASE_URL}${API_PREFIX}`;
export const REQUEST_TIMEOUT_MS = 15000;

// Web token storage: sessionStorage (cleared on tab/browser session close) used instead of localStorage
// to reduce persistent exposure. XSS risk remains (readable by same-origin scripts) - mitigations:
// never log tokens, no dangerouslySetInnerHTML, clear on 401. HttpOnly cookie auth would be safer
// but backend currently supports bearer JWT only (no backend auth contract change made).
const TOKEN_KEY = 'lifebuddy_dashboard_token';

export function getStoredToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function storeToken(token: string): void {
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}
export function clearStoredToken(): void {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: ApiErrorBody['errors'];
  isNetworkError?: boolean;
  constructor(message: string, opts?: { status?: number; code?: string; details?: ApiErrorBody['errors']; isNetworkError?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.code = opts?.code;
    this.details = opts?.details;
    this.isNetworkError = opts?.isNetworkError;
  }
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = false, timeoutMs = REQUEST_TIMEOUT_MS, headers, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string> | undefined),
    };
    if (auth) {
      const token = getStoredToken();
      if (token) finalHeaders.Authorization = `Bearer ${token}`;
    }
    const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, { ...rest, headers: finalHeaders, signal: controller.signal });

    let body: any = null;
    const text = await res.text();
    if (text) {
      try { body = JSON.parse(text); } catch { body = { success: false, message: text }; }
    }

    if (!res.ok) {
      if (res.status === 401) {
        clearStoredToken();
      }
      const msg = body?.message || `Request failed (${res.status})`;
      throw new ApiError(msg, { status: res.status, code: body?.code, details: body?.errors });
    }
    return body as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your connection and try again.', { code: 'TIMEOUT', isNetworkError: true });
    }
    throw new ApiError(
      'Unable to connect to the Life Buddy server. Please verify the backend is running and VITE_API_BASE_URL is correct.',
      { code: 'NETWORK_ERROR', isNetworkError: true }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function getValidationMessages(details?: ApiErrorBody['errors']): string | null {
  if (!details || !Array.isArray(details)) return null;
  const msgs = details.map((d: any) => (typeof d === 'string' ? d : d?.message)).filter(Boolean);
  return msgs.length ? msgs.join('\n') : null;
}
