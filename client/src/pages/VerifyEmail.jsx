import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { auth as authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyEmail() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('idle'); // idle | verifying | success | error | resent
  const [error, setError]   = useState(null);

  // If there's a ?token=... param, attempt to verify immediately.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) return;
    setStatus('verifying');
    authApi.verifyEmail(token)
      .then(async () => {
        setStatus('success');
        try { if (user) await refresh(); } catch { /* */ }
        setTimeout(() => {
          if (user?.role) nav(`/${user.role}/onboarding`, { replace: true });
        }, 1500);
      })
      .catch((err) => { setStatus('error'); setError(err.message); });
  }, [location.search, nav, refresh, user]);

  async function resend() {
    setError(null);
    try {
      if (!user?.email) throw new Error('Sign in to resend the verification email.');
      await authApi.resendVerification(user.email);
      setStatus('resent');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto text-center">
        {status === 'verifying' && (
          <>
            <h1 className="font-display text-2xl text-brand-900 mb-2">Verifying your email…</h1>
            <p className="text-brand-600">Hang tight.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto mb-3 text-2xl">✓</div>
            <h1 className="font-display text-2xl text-brand-900 mb-2">Email verified.</h1>
            <p className="text-brand-600">Redirecting you now…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="font-display text-2xl text-brand-900 mb-2">That link didn't work.</h1>
            <p className="text-brand-600 mb-4 text-sm">{error}</p>
            {user && <button onClick={resend} className="btn-primary">Send a new link</button>}
            {!user && <Link to="/login" className="btn-primary">Sign in</Link>}
          </>
        )}
        {status === 'resent' && (
          <>
            <h1 className="font-display text-2xl text-brand-900 mb-2">Sent.</h1>
            <p className="text-brand-600">Check your inbox for a new link.</p>
          </>
        )}
        {status === 'idle' && (
          <>
            <h1 className="font-display text-2xl text-brand-900 mb-2">Verify your email</h1>
            <p className="text-brand-600 mb-4">
              We sent you a verification link{user?.email ? ` to ${user.email}` : ''}. Click it to activate your account.
            </p>
            {user ? (
              <button onClick={resend} className="btn-outline">Resend verification email</button>
            ) : (
              <Link to="/login" className="btn-primary">Sign in</Link>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
