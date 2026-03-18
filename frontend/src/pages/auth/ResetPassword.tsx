import React from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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
            <div className="w-full max-w-md animate-fade-in-up">
                <div className="glass-card p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">Invalid Link</h2>
                        <p className="text-slate-400">This reset link is missing a token. Please request a new one.</p>
                    </div>
                    <Link to="/forgot-password" className="block w-full glass-button text-center">
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="w-full max-w-md animate-fade-in-up">
                <div className="glass-card p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">Password Updated!</h2>
                        <p className="text-slate-400">Your password has been reset. You can now log in with your new password.</p>
                    </div>
                    <button onClick={() => navigate('/login')} className="w-full glass-button">
                        Go to Login
                    </button>
                </div>
            </div>
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
        <div className="w-full max-w-md animate-fade-in-up">
            <div className="glass-card p-8 md:p-10 space-y-8">
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 mb-4">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Reset Password</h2>
                    <p className="text-slate-400">Enter your new password below</p>
                </div>

                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-center text-sm">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-300 ml-1">New Password</label>
                        <input
                            {...register('newPassword', {
                                required: 'Password is required',
                                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                            })}
                            type="password"
                            className="w-full glass-input"
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                        {errors.newPassword && (
                            <span className="text-red-400 text-xs ml-1">{errors.newPassword.message}</span>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-300 ml-1">Confirm Password</label>
                        <input
                            {...register('confirmPassword', {
                                required: 'Please confirm your password',
                                validate: (val) => val === watch('newPassword') || 'Passwords do not match',
                            })}
                            type="password"
                            className="w-full glass-input"
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                        {errors.confirmPassword && (
                            <span className="text-red-400 text-xs ml-1">{errors.confirmPassword.message}</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full glass-button mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {status === 'loading' ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Updating...
                            </>
                        ) : 'Set New Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
