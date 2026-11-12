import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="center-screen">
      <h1>Page not found</h1>
      <p className="muted">The page you requested does not exist.</p>
      <Link className="btn btn-primary" to="/dashboard">Go to Overview</Link>
    </div>
  );
}
