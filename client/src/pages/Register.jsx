import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function passwordStrength(pw) {
  if (!pw) return null;
  const checks = [
    { label: 'At least 8 characters', ok: pw.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(pw) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(pw) },
    { label: 'Number', ok: /[0-9]/.test(pw) },
  ];
  return checks;
}

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('seller');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPwHints, setShowPwHints] = useState(false);

  useEffect(() => {
    const r = params.get('role');
    if (r === 'seller' || r === 'buyer') setRole(r);
  }, [params]);

  const pwChecks = passwordStrength(password);
  const pwValid = pwChecks?.every((c) => c.ok);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!pwValid) { setError('Password does not meet requirements.'); return; }
    if (!termsAccepted) { setError('You must accept the Terms of Service and Privacy Policy.'); return; }
    setBusy(true);
    try {
      const user = await register({
        email: email.trim().toLowerCase(),
        password,
        role,
        fullName: fullName.trim(),
        termsAccepted: true,
      });
      nav(`/${user.role}/onboarding`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto">
        <h1 className="font-display text-3xl text-brand-900 mb-2">Create your account</h1>
        <p className="text-brand-600 mb-6">Tell us a little about yourself to get started.</p>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRole('seller')} className={`${role === 'seller' ? 'btn-primary' : 'btn-outline'} text-sm`}>
              I'm a seller
            </button>
            <button type="button" onClick={() => setRole('buyer')} className={`${role === 'buyer' ? 'btn-primary' : 'btn-outline'} text-sm`}>
              I'm a buyer
            </button>
          </div>

          <div>
            <label className="label">Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPwHints(true)}
              required
              autoComplete="new-password"
            />
            {showPwHints && pwChecks && (
              <ul className="mt-2 space-y-1">
                {pwChecks.map((c) => (
                  <li key={c.label} className={`text-xs flex items-center gap-1.5 ${c.ok ? 'text-green-700' : 'text-brand-500'}`}>
                    <span>{c.ok ? '✓' : '○'}</span> {c.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-start gap-3">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-700"
              required
            />
            <label htmlFor="terms" className="text-sm text-brand-700 leading-snug">
              I agree to the{' '}
              <Link to="/terms" className="text-brand-900 underline" target="_blank">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-brand-900 underline" target="_blank">Privacy Policy</Link>
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
          )}

          <button type="submit" disabled={busy || !termsAccepted} className="btn-primary w-full">
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-sm text-brand-600 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-800 font-medium hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
