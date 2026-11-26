import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('Seedsong error:', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="error-screen">
        <div style={{ display: 'grid', gap: 16, justifyItems: 'center', maxWidth: 420 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, margin: 0 }}>Something went quiet.</h1>
          <p className="muted">The garden hit a snag. Your settings are saved, so replanting picks up where you were.</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Replant
          </button>
        </div>
      </main>
    );
  }
}
