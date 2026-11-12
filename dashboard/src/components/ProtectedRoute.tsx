import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { sessionStatus, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || sessionStatus === 'loading') {
    return (
      <div className="center-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Checking your session…</p>
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (sessionStatus === 'offline_unverified') {
    return <Outlet context={{ offline: true }} />;
  }

  return <Outlet />;
}
