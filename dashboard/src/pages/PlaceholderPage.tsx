import React from 'react';

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="page">
      <div className="card">
        <h2>{title}</h2>
        <div className="placeholder-box" role="status">
          <p><strong>Coming in a later phase.</strong></p>
          <p className="muted">{description || 'This management module is not implemented in Phase 6A. No data is loaded and no CRUD actions are available here yet.'}</p>
        </div>
      </div>
    </div>
  );
}
