import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth as authApi } from '../api/client.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="container-narrow py-16">
        <div className="card card-pad max-w-md mx-auto text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h1 className="font-display text-2xl text-brand-900 mb-2">Check your inbox</h1>
          <p className="text-brand-600 mb-6">
            If an account exists for that email, we sent a password reset link. Check your spam folder if you don't see it.
          </p>
          <Link to="/login" className="btn-primary">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto">
        <h1 className="font-display text-3xl text-brand-900 mb-2">Reset your password</h1>
        <p className="text-brand-600 mb-6">Enter your email and we'll send a reset link.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <div className="mt-4 text-sm text-brand-600 text-center">
          <Link to="/login" className="text-brand-800 font-medium hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
