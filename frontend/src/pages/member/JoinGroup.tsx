import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { groupService } from '@/services/group.service';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'react-hot-toast';
import { getCountryOption } from '@/constants/countries';
import { isValidNationalId } from '@/utils/kyc';

export function JoinGroupPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const [requestForm, setRequestForm] = useState({
        groupCode: '',
        nationalId: '',
        dateOfBirth: '',
    });

    const user = useAuthStore((s) => s.user);
    const isLoggedIn = !!user;
    const country = getCountryOption((user as any)?.countryCode);

    const { data: invitation, isLoading } = useQuery({
        queryKey: ['invitation', token],
        queryFn: () => groupService.getGroupByInvitation(token!),
        enabled: !!token,
    });

    const group = invitation?.group;

    const joinMutation = useMutation({
        mutationFn: () => groupService.joinGroup(token!),
        onSuccess: () => {
            navigate(`/member/dashboard`);
        },
        onError: (err: any) => {
            setError(err.response?.data?.error?.message || t('auth.something_wrong'));
        }
    });

    const requestJoinMutation = useMutation({
        mutationFn: () =>
            groupService.requestJoinByCode({
                groupCode: requestForm.groupCode,
                nationalId: requestForm.nationalId,
                ...(requestForm.dateOfBirth ? { dateOfBirth: requestForm.dateOfBirth } : {}),
            }),
        onSuccess: () => {
            toast.success(String(t('join.request_sent', { defaultValue: 'Request sent. Wait for the admin to approve.' } as any)));
            navigate('/member/dashboard');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error?.message || err?.response?.data?.message;
            toast.error(msg || String(t('auth.something_wrong')));
        },
    });

    const handleAcceptInvitation = () => {
        if (!isLoggedIn) {
            // Store target join link in session storage to redirect back after login
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            navigate('/login');
            return;
        }
        joinMutation.mutate();
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <div className="text-indigo-400 font-medium animate-pulse">{t('join.verifying_invitation')}</div>
        </div>
    );

    if (token && (!group || error)) {
        return (
            <div className="w-full max-w-md animate-fade-in-up">
                <div className="glass-card p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">{t('join.invalid_invitation')}</h2>
                        <p className="text-slate-400">{error || t('join.invalid_invite_msg')}</p>
                    </div>
                    <button
                        onClick={() => navigate('/member/dashboard')}
                        className="w-full glass-button btn-secondary"
                    >
                        {t('common.return_to_dashboard')}
                    </button>
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="w-full max-w-md animate-fade-in-up">
                <div className="glass-card p-8 md:p-10 space-y-8">
                    <div className="text-center space-y-3">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/10 px-3 py-1 rounded-md border border-indigo-500/20">
                            {String(t('join.request_to_join', { defaultValue: 'Request to join' } as any))}
                        </span>
                        <h2 className="text-3xl font-bold text-white tracking-tight">{String(t('join.request_join_title', { defaultValue: 'Join a group' } as any))}</h2>
                        <p className="text-slate-400 text-sm">{String(t('join.request_join_desc', { defaultValue: 'Send a request to the group admin. You will be added after approval.' } as any))}</p>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!isLoggedIn) {
                                sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
                                navigate('/login');
                                return;
                            }

                            const cc = (user as any)?.countryCode || null;
                            if (!isValidNationalId(cc, requestForm.nationalId)) {
                                const hint = country?.kycHint ? ` (${country.kycHint})` : '';
                                toast.error(`${String(t('join.invalid_national_id', { defaultValue: 'Invalid ID format' } as any))}${hint}`);
                                return;
                            }
                            requestJoinMutation.mutate();
                        }}
                        className="space-y-5"
                    >
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{String(t('join.group_code', { defaultValue: 'Group code' } as any))}</label>
                            <input
                                required
                                value={requestForm.groupCode}
                                onChange={(e) => setRequestForm((p) => ({ ...p, groupCode: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                placeholder={String(t('join.group_code_placeholder', { defaultValue: 'e.g. ABC123' } as any))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                                {country?.kycLabel ? `${country.kycLabel}` : String(t('join.national_id', { defaultValue: 'National ID' } as any))}
                            </label>
                            <input
                                required
                                value={requestForm.nationalId}
                                onChange={(e) => setRequestForm((p) => ({ ...p, nationalId: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                placeholder={country?.kycHint || String(t('join.national_id_placeholder', { defaultValue: 'Your ID number' } as any))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{String(t('join.date_of_birth_optional', { defaultValue: 'Date of birth (optional)' } as any))}</label>
                            <input
                                type="date"
                                value={requestForm.dateOfBirth}
                                onChange={(e) => setRequestForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                            />
                        </div>

                        <button
                            disabled={requestJoinMutation.isPending}
                            className="w-full glass-button btn-primary py-4 disabled:opacity-50 flex items-center justify-center gap-2"
                            type="submit"
                        >
                            {requestJoinMutation.isPending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {String(t('common.processing', { defaultValue: 'Processing...' } as any))}
                                </>
                            ) : (
                                String(t('join.send_request', { defaultValue: 'Send request' } as any))
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md animate-fade-in-up">
            <div className="glass-card p-8 md:p-10 space-y-8">
                <div className="text-center space-y-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/10 px-3 py-1 rounded-md border border-indigo-500/20">
                        {t('join.group_invitation')}
                    </span>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold text-white tracking-tight">{t('join.join_group_title', { groupName: group.groupName })}</h2>
                        <p className="text-slate-400">{t('join.collaborative_opportunity')}</p>
                    </div>
                </div>

                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t('common.contribution')}</span>
                        <span className="text-sm font-bold text-white">{group.currencyCode} {Number(group.contributionAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t('common.frequency')}</span>
                        <span className="text-sm font-bold text-indigo-300 capitalize">{group.paymentFrequency.toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t('join.group_capacity')}</span>
                        <span className="text-sm font-bold text-white">{group.maxMembers} {t('common.members')}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleAcceptInvitation}
                        disabled={joinMutation.isPending}
                        className="w-full glass-button btn-primary py-4 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {joinMutation.isPending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('common.processing')}
                            </>
                        ) : (
                            t('join.accept_invitation')
                        )}
                    </button>

                    <p className="text-[10px] text-slate-500 text-center uppercase tracking-[0.1em] font-bold px-4 leading-relaxed">
                        {t('join.commit_msg')}
                    </p>
                </div>
            </div>
        </div>
    );
}
