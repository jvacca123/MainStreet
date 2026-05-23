import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api/client.js';

function passwordStrength(pw) {
  if (!pw) return null;
  return [
    { label: 'At least 8 characters', ok: pw.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(pw) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(pw) },
    { label: 'Number', ok: /[0-9]/.test(pw) },
  ];
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pwChecks = passwordStrength(password);
  const pwValid = pwChecks?.every((c) => c.ok);

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new one.');
  }, [token]);

  async function submit(e) {
    e.preventDefault();
    if (!pwValid) { setError('Password does not meet requirements.'); return; }
    setError(null);
    setBusy(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="container-narrow py-16">
        <div className="card card-pad max-w-md mx-auto text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="font-display text-2xl text-brand-900 mb-2">Password updated</h1>
          <p className="text-brand-600 mb-6">Your password has been reset. Sign in with your new password.</p>
          <Link to="/login" className="btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto">
        <h1 className="font-display text-3xl text-brand-900 mb-2">Set a new password</h1>
        <form onSubmit={submit} className="space-y-4 mt-6">
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus autoComplete="new-password" />
            {pwChecks && (
              <ul className="mt-2 space-y-1">
                {pwChecks.map((c) => (
                  <li key={c.label} className={`text-xs flex items-center gap-1.5 ${c.ok ? 'text-green-700' : 'text-brand-500'}`}>
                    <span>{c.ok ? '✓' : '○'}</span> {c.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}
          <button type="submit" disabled={busy || !pwValid || !token} className="btn-primary w-full">
            {busy ? 'Updating…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
