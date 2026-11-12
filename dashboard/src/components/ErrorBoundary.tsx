import React from 'react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred while rendering this page.';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    // Log for debugging in development; avoid exposing sensitive data.
    console.error('Dashboard page error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <section className="card">
            <h2>{this.props.fallbackTitle || 'Something went wrong'}</h2>
            <div className="alert alert-error" role="alert">
              {this.state.message || 'An unexpected error occurred. Please refresh the page or try again.'}
            </div>
            <p className="muted">
              If this problem continues, check that the backend is running and reachable, then reload the dashboard.
              No data was intentionally changed by this error.
            </p>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
            </div>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}
