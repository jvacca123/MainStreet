import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext.jsx';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  email: z.string().email('Enter a valid email').max(254),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Add a lowercase letter')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/\d/,    'Add a number'),
  role: z.enum(['seller', 'buyer']),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms and Privacy Policy' }) }),
});

export default function Register() {
  const { register: signup } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState(null);

  const initialRole = (params.get('role') === 'seller' || params.get('role') === 'buyer') ? params.get('role') : 'seller';

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: initialRole,
      termsAccepted: false,
    },
  });
  const role = watch('role');

  useEffect(() => {
    if (params.get('role') === 'seller' || params.get('role') === 'buyer') {
      setValue('role', params.get('role'));
    }
  }, [params, setValue]);

  async function onSubmit(data) {
    setFormError(null);
    try {
      await signup({
        email: data.email,
        password: data.password,
        role: data.role,
        fullName: data.fullName,
        termsAccepted: 'true', // server validator expects literal string 'true'
      });
      nav('/verify-email', { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-md mx-auto">
        <h1 className="font-display text-3xl text-brand-900 mb-2">Create your account</h1>
        <p className="text-brand-600 mb-6">Tell us a little about yourself to get started.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setValue('role', 'seller')} className={`${role === 'seller' ? 'btn-primary' : 'btn-outline'} text-sm`}>I'm a seller</button>
            <button type="button" onClick={() => setValue('role', 'buyer')}  className={`${role === 'buyer'  ? 'btn-primary' : 'btn-outline'} text-sm`}>I'm a buyer</button>
          </div>

          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" className="input" {...register('fullName')} />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" className="input" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="new-password" className="input" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            <p className="mt-1 text-xs text-brand-500">At least 8 characters with uppercase, lowercase, and a number.</p>
          </div>

          <label className="flex items-start gap-2 text-sm text-brand-700">
            <input type="checkbox" {...register('termsAccepted')} className="mt-1 h-4 w-4 accent-brand-700" />
            <span>
              I agree to MainStreet's{' '}
              <Link to="/terms" className="text-brand-800 underline">Terms of Service</Link>{' '}and{' '}
              <Link to="/privacy" className="text-brand-800 underline">Privacy Policy</Link>.
            </span>
          </label>
          {errors.termsAccepted && <p className="text-xs text-red-600">{errors.termsAccepted.message}</p>}

          {formError && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {formError}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Creating account…' : 'Create account'}
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
