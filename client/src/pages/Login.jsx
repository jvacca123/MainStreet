import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext.jsx';

const schema = z.object({
  email: z.string().email('Enter a valid email').max(254),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data) {
    setFormError(null);
    try {
      const user = await login(data.email, data.password);
      const dest = location.state?.from || (!user.emailVerified ? '/verify-email'
                  : !user.hasProfile ? `/${user.role}/onboarding`
                  : `/${user.role}/dashboard`);
      nav(dest, { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto">
        <h1 className="font-display text-3xl text-brand-900 mb-2">Welcome back</h1>
        <p className="text-brand-600 mb-6">Sign in to your MainStreet account.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" autoComplete="email" type="email" className="input" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="label mb-0" htmlFor="password">Password</label>
              <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-800">Forgot password?</Link>
            </div>
            <input id="password" autoComplete="current-password" type="password" className="input" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {formError && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {formError}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-sm text-brand-600 text-center">
          New here?{' '}
          <Link to="/register" className="text-brand-800 font-medium hover:underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
