import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth as authApi } from '../api/client.js';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) { setStatus('error'); setError('No verification token provided.'); return; }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => { setStatus('error'); setError(err.message); });
  }, [token]);

  if (status === 'loading') {
    return <div className="container-narrow py-16 text-center text-brand-600">Verifying your email…</div>;
  }

  if (status === 'success') {
    return (
      <div className="container-narrow py-16">
        <div className="card card-pad max-w-md mx-auto text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="font-display text-2xl text-brand-900 mb-2">Email verified</h1>
          <p className="text-brand-600 mb-6">Your email has been confirmed. You're all set!</p>
          <Link to="/app" className="btn-primary">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto text-center">
        <div className="text-4xl mb-4">✗</div>
        <h1 className="font-display text-2xl text-brand-900 mb-2">Verification failed</h1>
        <p className="text-brand-600 mb-6">{error || 'This link may have expired. Request a new one from your dashboard.'}</p>
        <Link to="/login" className="btn-outline">Back to sign in</Link>
      </div>
    </div>
  );
}
