import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production we'd send this to a tracker (Sentry, etc.)
    // For now: log to console for the dev tools, but the rendered UI stays clean.
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 text-2xl">⚠︎</div>
          <h1 className="font-display text-2xl text-brand-900 mb-2">Something went wrong.</h1>
          <p className="text-brand-600 mb-6 text-sm">
            We hit an unexpected error. Your work is safe — try refreshing or heading home.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="btn-outline">Reload</button>
            <button onClick={this.handleReset} className="btn-primary">Go home</button>
          </div>
        </div>
      </div>
    );
  }
}
