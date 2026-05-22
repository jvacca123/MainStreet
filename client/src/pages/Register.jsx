import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('seller');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = params.get('role');
    if (r === 'seller' || r === 'buyer') setRole(r);
  }, [params]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await register({ email, password, role, fullName });
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
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            <p className="mt-1 text-xs text-brand-500">At least 6 characters.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
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
