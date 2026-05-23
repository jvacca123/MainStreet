import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { auth as authApi } from '../api/client.js';

const schema = z.object({ email: z.string().email('Enter a valid email').max(254) });

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(data) {
    setError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto">
        <h1 className="font-display text-3xl text-brand-900 mb-2">Reset your password</h1>
        {sent ? (
          <>
            <p className="text-brand-600 mb-4">If an account exists for that email, we've sent a reset link. Check your inbox (and spam folder).</p>
            <Link to="/login" className="btn-primary w-full block text-center">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="text-brand-600 mb-6">Enter the email address tied to your account.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" className="input" {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              {error && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <div className="mt-6 text-sm text-brand-600 text-center">
              Remembered it?{' '}
              <Link to="/login" className="text-brand-800 font-medium hover:underline">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
