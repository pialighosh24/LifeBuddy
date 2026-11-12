import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { AuthUser, CaregiverLoginPayload, UserPinLoginPayload } from '../types/auth';
import { getMe, loginCaregiver, loginUserWithPin, logout as apiLogout } from '../services/api/authApi';
import { saveToken, clearToken, getToken } from '../services/auth/tokenStorage';
import { ApiError } from '../services/api/client';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'offline_unverified';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionStatus: SessionStatus;
  sessionError: string | null;
  signInCaregiver: (payload: CaregiverLoginPayload) => Promise<void>;
  signInUserWithPin: (payload: UserPinLoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setSessionError(null);
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        setSessionStatus('unauthenticated');
        return;
      }
      const res = await getMe();
      setUser(res.data.user);
      setSessionStatus('authenticated');
    } catch (err) {
      if (err instanceof ApiError) {
        // Explicit invalid/expired token confirmed by backend -> clear and require login
        if (err.status === 401) {
          await clearToken().catch(() => {});
          setUser(null);
          setSessionStatus('unauthenticated');
          setSessionError(null);
          return;
        }
        // Network/timeout/temporary server issues -> preserve token, do not redirect to login
        if (err.isNetworkError || !err.status || err.status >= 500) {
          setUser(null);
          setSessionStatus('offline_unverified');
          setSessionError(err.message || 'Unable to verify session due to a connection issue.');
          return;
        }
        // Other explicit client errors (e.g. 403 unexpected) - treat conservatively as unauthenticated but keep token? better clear on auth failure
        await clearToken().catch(() => {});
        setUser(null);
        setSessionStatus('unauthenticated');
        setSessionError(err.message);
        return;
      }
      // Unknown error: preserve token to be safe and allow retry
      setUser(null);
      setSessionStatus('offline_unverified');
      setSessionError('Unable to verify your session. Please check your connection and retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signInCaregiver = useCallback(async (payload: CaregiverLoginPayload) => {
    const res = await loginCaregiver(payload);
    await saveToken(res.data.token);
    setUser(res.data.user);
    setSessionStatus('authenticated');
    setSessionError(null);
  }, []);

  const signInUserWithPin = useCallback(async (payload: UserPinLoginPayload) => {
    const res = await loginUserWithPin(payload);
    await saveToken(res.data.token);
    setUser(res.data.user);
    setSessionStatus('authenticated');
    setSessionError(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // stateless logout / best effort; always clear local session
    } finally {
      await clearToken().catch(() => {});
      setUser(null);
      setSessionStatus('unauthenticated');
      setSessionError(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: sessionStatus === 'authenticated' && !!user,
    sessionStatus,
    sessionError,
    signInCaregiver,
    signInUserWithPin,
    signOut,
    refreshSession,
  }), [user, isLoading, sessionStatus, sessionError, signInCaregiver, signInUserWithPin, signOut, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
