import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { groupService } from '@/services/group.service';
import { useTranslation } from 'react-i18next';
import { publishAppEvent } from '@/lib/appEvents';

interface DeleteGroupDialogProps {
    group: any;
    isOpen: boolean;
    onClose: () => void;
}

export function DeleteGroupDialog({ group, isOpen, onClose }: DeleteGroupDialogProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState('');

    const isDraft = group?.status === 'DRAFT';
    const isClosed = group?.status === 'CLOSED';

    const mutation = useMutation({
        mutationFn: () => groupService.deleteGroup(group.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            publishAppEvent({ type: 'groups_changed', groupId: group.id });
            onClose();
            navigate('/admin/dashboard');
        },
        onError: (err: any) => {
            setError(err?.response?.data?.error?.message || 'Failed. Please try again.');
        },
    });

    if (!isOpen) return null;

    const isConfirmed = confirmText === group?.groupName;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass-card w-full max-w-lg p-6 relative border border-rose-500/20 shadow-2xl overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
                
                <button
                    onClick={() => { onClose(); setConfirmText(''); setError(''); }}
                    className="absolute top-5 right-5 text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-95 z-10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex items-start gap-4 pr-8">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xl flex-shrink-0 animate-pulse">
                        ⚠️
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">
                            {isDraft ? t('admin.delete_group_perm') : t('dashboard.close_group')}
                        </h2>
                        <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">
                            {isDraft ? t('admin.delete_draft_msg') : t('admin.archive_active_msg')}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold animate-shake">
                        {error}
                    </div>
                )}

                <div className="mt-6 space-y-1.5 focus-within:translate-x-1 transition-transform">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                        {t('admin.type_to_confirm', { name: group?.groupName })}
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                        placeholder={t('admin.group_name_placeholder')}
                        className="w-full bg-white/5 border border-rose-500/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700 font-mono"
                    />
                </div>

                <div className="flex gap-3 pt-6">
                    <button
                        onClick={() => { onClose(); setConfirmText(''); setError(''); }}
                        className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        {t('common.cancel')}
                    </button>
                    <div className="flex-[2] flex gap-3">
                        <button
                            onClick={() => mutation.mutate()}
                            disabled={!isConfirmed || mutation.isPending}
                            className="flex-1 relative overflow-hidden group/btn px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span className="relative z-10">
                                {mutation.isPending
                                    ? t('common.processing')
                                    : isDraft ? t('admin.delete_forever') : t('dashboard.close_group')}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        </button>

                        {!isDraft && (
                            <button
                                onClick={() => {
                                    onClose();
                                    setConfirmText('');
                                    setError('');
                                    navigate(`/admin/groups/${group.id}/delete`);
                                }}
                                disabled={!isConfirmed || !isClosed}
                                className="flex-1 relative overflow-hidden group/btn px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-rose-500/20 hover:shadow-rose-500/40 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isClosed ? undefined : 'Close the group first to enable permanent deletion'}
                            >
                                <span className="relative z-10">{t('admin.delete_forever')}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
