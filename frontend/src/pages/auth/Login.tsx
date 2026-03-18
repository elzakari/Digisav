import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '@/services/auth.service';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

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
    <div className="w-full max-w-md animate-fade-in-up">
      <div className="flex justify-end mb-4">
        <LanguageSwitcher />
      </div>
      <div className="glass-card p-8 md:p-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-bold tracking-tight">{t('auth.welcome_back')}</h2>
          <p className="text-slate-400">{t('auth.secure_access')}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300 ml-1">{t('common.email')}</label>
            <input
              {...register('email', { required: t('errors.email_required') })}
              type="email"
              className="w-full glass-input"
              placeholder="john@example.com"
              autoComplete="email"
            />
            {errors.email && (
              <span className="text-red-400 text-xs ml-1">{errors.email.message as string}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="block text-sm font-medium text-slate-300">{t('common.password')}</label>
              <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300">{t('common.forgot_password')}</Link>
            </div>
            <input
              {...register('password', { required: t('errors.password_required') })}
              type="password"
              className="w-full glass-input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && (
              <span className="text-red-400 text-xs ml-1">{errors.password.message as string}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-button btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('auth.authenticating') : t('common.signin')}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm text-slate-400">
            {t('common.dont_have_account')}{' '}
            <Link to="/register" className="font-semibold text-white hover:text-indigo-300 transition-colors">
              {t('common.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
