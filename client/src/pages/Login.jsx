import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('owner@mainstreet.com');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      if (!user.hasProfile) nav(`/${user.role}/onboarding`);
      else nav(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto">
        <h1 className="font-display text-3xl text-brand-900 mb-2">Welcome back</h1>
        <p className="text-brand-600 mb-6">Sign in to your MainStreet account.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-cream-dark border border-brand-100 p-4 text-xs text-brand-600 space-y-1">
          <div className="font-medium text-brand-800 mb-1">Demo accounts (password: <code>demo1234</code>)</div>
          <div>Seller: <code>owner@mainstreet.com</code></div>
          <div>Buyer: <code>buyer@mainstreet.com</code></div>
        </div>

        <div className="mt-6 text-sm text-brand-600 text-center">
          New here?{' '}
          <Link to="/register" className="text-brand-800 font-medium hover:underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
