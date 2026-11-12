import { API_URL, REQUEST_TIMEOUT_MS } from '../../constants/config';
import { getToken, clearToken } from '../auth/tokenStorage';
import type { ApiErrorBody } from '../../types/auth';

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
      const token = await getToken();
      if (token) finalHeaders.Authorization = `Bearer ${token}`;
    }

    const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      signal: controller.signal,
    });

    let body: any = null;
    const text = await res.text();
    if (text) {
      try { body = JSON.parse(text); } catch { body = { success: false, message: text }; }
    }

    if (!res.ok) {
      if (res.status === 401) {
        // If token invalid/expired, clear stored token (session handling will redirect)
        await clearToken().catch(() => {});
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
    // Network/connectivity errors (fetch failures)
    throw new ApiError(
      'Unable to connect to the Life Buddy server. Please check EXPO_PUBLIC_API_BASE_URL, ensure the backend is running, and verify your network (emulator/phone IP).',
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
