import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { auth as authApi } from '../api/client.js';

const schema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Add a lowercase letter')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/\d/,    'Add a number'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(data) {
    setError(null);
    try {
      await authApi.resetPassword({ token, password: data.password });
      setDone(true);
    } catch (err) { setError(err.message); }
  }

  if (!token) {
    return (
      <div className="container-narrow py-16">
        <div className="card card-pad max-w-md mx-auto text-center">
          <h1 className="font-display text-2xl text-brand-900 mb-2">Missing reset token</h1>
          <p className="text-brand-600 mb-4">This link looks broken. Request a new password reset.</p>
          <Link to="/forgot-password" className="btn-primary">Get a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto">
        <h1 className="font-display text-3xl text-brand-900 mb-2">Set a new password</h1>
        {done ? (
          <>
            <p className="text-brand-600 mb-4">Password updated. You can sign in with your new password now.</p>
            <Link to="/login" className="btn-primary w-full block text-center">Sign in</Link>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="password">New password</label>
              <input id="password" type="password" autoComplete="new-password" className="input" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              <p className="mt-1 text-xs text-brand-500">At least 8 chars with upper, lower, and a number.</p>
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" autoComplete="new-password" className="input" {...register('confirm')} />
              {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm.message}</p>}
            </div>
            {error && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
