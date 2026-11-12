import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, getValidationMessages } from '../services/apiClient';

export function LoginPage() {
  const { signInCaregiver, sessionStatus, isAuthenticated } = useAuth();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (isAuthenticated && sessionStatus === 'authenticated') {
    return <Navigate to={from} replace />;
  }

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = 'Password is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signInCaregiver({ email: email.trim(), password });
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = getValidationMessages(err.details) || err.message || 'Unable to sign in.';
        if (err.status === 401) setError('Invalid email or password. Please check your credentials and try again.');
        else if (err.status === 403) setError('This dashboard is available to caregiver accounts only.');
        else if (err.isNetworkError || !err.status || err.status >= 500) setError(err.message || 'Unable to connect to the server. Please try again.');
        else setError(msg);
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main">
        <div className="login-brand">
          <span className="brand-mark lg" aria-hidden="true">LB</span>
          <h1>Life Buddy</h1>
          <p className="muted">Caregiver Dashboard Sign In</p>
        </div>

        {error ? <div className="alert alert-error" role="alert">{error}</div> : null}

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-err' : undefined}
              disabled={submitting}
              required
            />
            {fieldErrors.email ? <div id="email-err" className="field-error">{fieldErrors.email}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-err' : undefined}
              disabled={submitting}
              required
            />
            {fieldErrors.password ? <div id="password-err" className="field-error">{fieldErrors.password}</div> : null}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-note muted">Use your caregiver account credentials. Care-user accounts cannot access this dashboard.</p>
      </div>
    </div>
  );
}
