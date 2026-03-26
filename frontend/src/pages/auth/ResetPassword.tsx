import React from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, XCircle, Lock } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface ResetForm {
    newPassword: string;
    confirmPassword: string;
}

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetForm>();
    const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = React.useState('');

    if (!token) {
        return (
            <AuthLayout
              pageTitle="Germinos — Reset Password"
              title="Reset password"
              subtitle="This reset link is missing a token. Please request a new one."
            >
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-rose-700">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-rose-900">Invalid link</div>
                    <div className="mt-1 text-sm text-rose-800">Request a new password reset link to continue.</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/forgot-password"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  Request new link
                </Link>
              </div>
            </AuthLayout>
        );
    }

    if (status === 'success') {
        return (
            <AuthLayout
              pageTitle="Germinos — Reset Password"
              title="Password updated"
              subtitle="You can now log in with your new password."
            >
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-900">Password updated</div>
                    <div className="mt-1 text-sm text-emerald-800">Your password has been reset successfully.</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  Go to Login
                </button>
              </div>
            </AuthLayout>
        );
    }

    const onSubmit = async (data: ResetForm) => {
        setStatus('loading');
        setErrorMsg('');
        try {
            await axios.post(`${API_URL}/auth/reset-password`, { token, newPassword: data.newPassword });
            setStatus('success');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error?.message || 'Failed to reset password. The link may have expired.');
            setStatus('error');
        }
    };

    return (
        <AuthLayout
          pageTitle="Germinos — Reset Password"
          title="Reset password"
          subtitle="Enter your new password below."
        >
          {status === 'error' && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert" aria-live="polite">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-700">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="newPassword"
                  {...register('newPassword', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                  })}
                  type="password"
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={errors.newPassword ? 'true' : 'false'}
                  aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
                />
              </div>
              {errors.newPassword && (
                <div id="newPassword-error" className="text-rose-700 text-xs" role="alert">{String(errors.newPassword.message)}</div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="confirmPassword"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (val) => val === watch('newPassword') || 'Passwords do not match',
                  })}
                  type="password"
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                />
              </div>
              {errors.confirmPassword && (
                <div id="confirmPassword-error" className="text-rose-700 text-xs" role="alert">{String(errors.confirmPassword.message)}</div>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Updating…' : 'Set New Password'}
            </button>
          </form>

          <div className="mt-6">
            <Link to="/login" className="text-sm font-medium text-indigo-700 hover:text-indigo-800">Back to Login</Link>
          </div>
        </AuthLayout>
    );
}
