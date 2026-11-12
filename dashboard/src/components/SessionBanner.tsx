import React from 'react';
import { useAuth } from '../context/AuthContext';

export function SessionBanner() {
  const { sessionStatus, sessionError, refreshSession, signOut } = useAuth();
  if (sessionStatus !== 'offline_unverified') return null;
  return (
    <div className="banner banner-warning" role="alert">
      <div>
        <strong>Connection issue.</strong> {sessionError || 'Unable to verify your session.'} Your sign-in token has been kept on this device. You are not signed out.
      </div>
      <div className="banner-actions">
        <button className="btn btn-primary btn-sm" onClick={refreshSession}>Retry</button>
        <button className="btn btn-outline btn-sm" onClick={signOut}>Sign out locally</button>
      </div>
    </div>
  );
}
