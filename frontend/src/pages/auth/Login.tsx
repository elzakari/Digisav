import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '@/services/auth.service';
import { AuthLayout } from '@/components/auth/AuthLayout';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.login(data);
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else if (response.user.role === 'SYS_ADMIN') {
        navigate('/sysadmin/dashboard');
      } else if (response.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/member/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      pageTitle="Germinos — Login"
      title={t('common.login', { defaultValue: 'Log in' })}
      subtitle={t('auth.secure_access', { defaultValue: 'Secure access to your Germinos dashboard.' })}
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
            {t('common.email')}
          </label>
          <input
            id="email"
            {...register('email', { required: t('errors.email_required') })}
            type="email"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            placeholder="john@example.com"
            autoComplete="email"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <div id="email-error" className="text-rose-700 text-xs" role="alert">
              {errors.email.message as string}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              {t('common.password')}
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {t('common.forgot_password')}
            </Link>
          </div>
          <input
            id="password"
            {...register('password', { required: t('errors.password_required') })}
            type="password"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <div id="password-error" className="text-rose-700 text-xs" role="alert">
              {errors.password.message as string}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('auth.authenticating', { defaultValue: 'Authenticating…' }) : t('common.signin')}
        </button>
      </form>

      <div className="mt-6 text-sm text-zinc-600">
        {t('common.dont_have_account')}{' '}
        <Link to="/register" className="font-semibold text-indigo-700 hover:text-indigo-800">
          {t('common.register')}
        </Link>
      </div>
    </AuthLayout>
  );
}
