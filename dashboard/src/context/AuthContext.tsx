import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../types/auth';
import { getMe, loginCaregiver, logout as apiLogout } from '../services/authApi';
import { ApiError, clearStoredToken, getStoredToken, storeToken } from '../services/apiClient';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'offline_unverified';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionStatus: SessionStatus;
  sessionError: string | null;
  signInCaregiver: (payload: { email: string; password: string }) => Promise<void>;
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
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setSessionStatus('unauthenticated');
        return;
      }
      const res = await getMe();
      const u = res.data.user;
      // Caregiver-only dashboard
      if (u.role !== 'caregiver') {
        clearStoredToken();
        setUser(null);
        setSessionStatus('unauthenticated');
        setSessionError('This dashboard is available to caregiver accounts only.');
        return;
      }
      setUser(u);
      setSessionStatus('authenticated');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearStoredToken();
          setUser(null);
          setSessionStatus('unauthenticated');
          setSessionError(null);
          return;
        }
        if (err.isNetworkError || !err.status || err.status >= 500) {
          // Preserve token; do not log out on temporary/network failures
          setUser(null);
          setSessionStatus('offline_unverified');
          setSessionError(err.message || 'Unable to verify session due to a connection issue.');
          return;
        }
        clearStoredToken();
        setUser(null);
        setSessionStatus('unauthenticated');
        setSessionError(err.message);
        return;
      }
      setUser(null);
      setSessionStatus('offline_unverified');
      setSessionError('Unable to verify your session. Please check your connection and retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshSession(); }, [refreshSession]);

  const signInCaregiver = useCallback(async (payload: { email: string; password: string }) => {
    const res = await loginCaregiver(payload);
    const u = res.data.user;
    if (u.role !== 'caregiver') {
      throw new ApiError('This dashboard is available to caregiver accounts only.', { status: 403, code: 'FORBIDDEN' });
    }
    storeToken(res.data.token);
    setUser(u);
    setSessionStatus('authenticated');
    setSessionError(null);
  }, []);

  const signOut = useCallback(async () => {
    try { await apiLogout(); } catch { /* stateless/best effort */ }
    finally {
      clearStoredToken();
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
    signOut,
    refreshSession,
  }), [user, isLoading, sessionStatus, sessionError, signInCaregiver, signOut, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
