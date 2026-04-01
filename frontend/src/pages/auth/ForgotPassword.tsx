import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Mail, KeyRound, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function ForgotPasswordPage() {
    const { t } = useTranslation();
    const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();
    const [status, setStatus] = React.useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

    const onSubmit = async (data: { email: string }) => {
        setStatus('loading');
        try {
            await axios.post(`${API_URL}/auth/forgot-password`, data);
            setStatus('sent');
        } catch {
            setStatus('error');
        }
    };

    if (status === 'sent') {
        return (
            <AuthLayout
              pageTitle="Germinos — Forgot Password"
              title={t('auth.forgot_password_title', { defaultValue: 'Forgot password' })}
              subtitle={t('auth.forgot_password_subtitle', { defaultValue: 'Request a password reset link.' })}
            >
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-900">{t('auth.check_console', { defaultValue: 'Check the terminal output' })}</div>
                    <div className="mt-1 text-sm text-emerald-800">
                      {t('auth.reset_link_msg', { defaultValue: 'A reset link has been generated.' })}{' '}
                      <span className="font-semibold">{t('auth.backend_terminal_msg', { defaultValue: 'Look in the backend terminal.' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  {t('common.back_to_login', { defaultValue: 'Back to Login' })}
                </Link>
              </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
          pageTitle="Germinos — Forgot Password"
          title={t('auth.forgot_password_title', { defaultValue: 'Forgot password' })}
          subtitle={t('auth.forgot_password_subtitle', { defaultValue: 'Enter your email to receive a reset link.' })}
        >
          {status === 'error' && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert" aria-live="polite">
              {t('auth.something_wrong', { defaultValue: 'Something went wrong. Please try again.' })}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="fpEmail" className="block text-sm font-medium text-zinc-700">
                {t('common.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="fpEmail"
                  {...register('email', { required: t('errors.email_required') })}
                  type="email"
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  placeholder="john@example.com"
                  autoComplete="email"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'fpEmail-error' : undefined}
                />
              </div>
              {errors.email && (
                <div id="fpEmail-error" className="text-rose-700 text-xs" role="alert">
                  {String(errors.email.message)}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <KeyRound className="h-4 w-4" />
                  {t('common.sending', { defaultValue: 'Sending…' })}
                </>
              ) : (
                t('auth.send_reset_link', { defaultValue: 'Send reset link' })
              )}
            </button>
          </form>

          <div className="mt-6">
            <Link to="/login" className="text-sm font-medium text-indigo-700 hover:text-indigo-800">
              {t('common.back_to_login', { defaultValue: 'Back to Login' })}
            </Link>
          </div>
        </AuthLayout>
    );
}
