import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/auth/AuthLayout';

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      await authService.register(data);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      pageTitle="Germinos — Register"
      title={t('common.register', { defaultValue: 'Create account' })}
      subtitle={t('auth.register_subtitle', { defaultValue: 'Join Germinos and start your savings journey.' })}
    >
      {error && (
        <div
          className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700">
            {t('auth.full_name', { defaultValue: 'Full Name' })}
          </label>
          <input
            id="fullName"
            {...register('fullName', { required: t('errors.full_name_required', { defaultValue: 'Full Name is required' }) })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            placeholder="John Doe"
            autoComplete="name"
            aria-invalid={errors.fullName ? 'true' : 'false'}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          />
          {errors.fullName && (
            <div id="fullName-error" className="text-rose-700 text-xs" role="alert">
              {errors.fullName.message as string}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="regEmail" className="block text-sm font-medium text-zinc-700">
            {t('common.email')}
          </label>
          <input
            id="regEmail"
            {...register('email', { required: t('errors.email_required') })}
            type="email"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            placeholder="john@example.com"
            autoComplete="email"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'regEmail-error' : undefined}
          />
          {errors.email && (
            <div id="regEmail-error" className="text-rose-700 text-xs" role="alert">
              {errors.email.message as string}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-zinc-700">
            {t('auth.phone_number', { defaultValue: 'Phone Number' })}
          </label>
          <input
            id="phoneNumber"
            {...register('phoneNumber', { required: t('errors.phone_required', { defaultValue: 'Phone Number is required' }) })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            placeholder="+254 700 000000"
            autoComplete="tel"
            aria-invalid={errors.phoneNumber ? 'true' : 'false'}
            aria-describedby={errors.phoneNumber ? 'phone-error' : undefined}
          />
          {errors.phoneNumber && (
            <div id="phone-error" className="text-rose-700 text-xs" role="alert">
              {errors.phoneNumber.message as string}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="regPassword" className="block text-sm font-medium text-zinc-700">
            {t('common.password')}
          </label>
          <input
            id="regPassword"
            {...register('password', { required: t('errors.password_required') })}
            type="password"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'regPassword-error' : undefined}
          />
          {errors.password && (
            <div id="regPassword-error" className="text-rose-700 text-xs" role="alert">
              {errors.password.message as string}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('auth.creating_account', { defaultValue: 'Creating account…' }) : t('common.register', { defaultValue: 'Register' })}
        </button>
      </form>

      <div className="mt-6 text-sm text-zinc-600">
        {t('auth.already_have_account', { defaultValue: 'Already have an account?' })}{' '}
        <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">
          {t('common.login')}
        </Link>
      </div>
    </AuthLayout>
  );
}
