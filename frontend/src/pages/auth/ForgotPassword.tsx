import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

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
            <div className="w-full max-w-md animate-fade-in-up">
                <div className="glass-card p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">{t('auth.check_console')}</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {t('auth.reset_link_msg')}<br />
                            <span className="text-indigo-400 font-medium">{t('auth.backend_terminal_msg')}</span>
                        </p>
                    </div>
                    <Link to="/login" className="block w-full glass-button btn-secondary text-center">
                        {t('common.back_to_login')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md animate-fade-in-up">
            <div className="glass-card p-8 md:p-10 space-y-8">
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 mb-4">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('auth.forgot_password_title')}</h2>
                    <p className="text-slate-400">{t('auth.forgot_password_subtitle')}</p>
                </div>

                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-center text-sm">
                        {t('auth.something_wrong')}
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
                            <span className="text-red-400 text-xs ml-1">{errors.email.message}</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full glass-button btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {status === 'loading' ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('common.sending')}
                            </>
                        ) : t('auth.send_reset_link')}
                    </button>
                </form>

                <div className="text-center">
                    <Link to="/login" className="text-sm text-slate-400 hover:text-indigo-300 transition-colors">
                        ← {t('common.back_to_login')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
