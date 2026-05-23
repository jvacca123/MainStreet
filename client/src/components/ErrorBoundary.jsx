import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-8">
          <div className="card card-pad max-w-md w-full text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="font-display text-2xl text-brand-900 mb-2">Something went wrong</h1>
            <p className="text-brand-600 mb-6">
              An unexpected error occurred. Please refresh the page or go back to the home page.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => window.location.reload()} className="btn-outline">Refresh page</button>
              <Link to="/" className="btn-primary" onClick={() => this.setState({ hasError: false })}>Go home</Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
