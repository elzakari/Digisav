import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService } from '@/services/group.service';
import { useTranslation } from 'react-i18next';

interface EditGroupModalProps {
    group: any;
    isOpen: boolean;
    onClose: () => void;
}

export function EditGroupModal({ group, isOpen, onClose }: EditGroupModalProps) {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [form, setForm] = useState({
        groupName: '',
        maxMembers: 0,
        gracePeriodDays: 0,
        groupFeePercentage: 0,
        allowMicroInvestments: false,
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (group && isOpen) {
            setForm({
                groupName: group.groupName || '',
                maxMembers: group.maxMembers || 0,
                gracePeriodDays: group.gracePeriodDays || 0,
                groupFeePercentage: group.groupFeePercentage || 0,
                allowMicroInvestments: group.allowMicroInvestments || false,
            });
            setError('');
        }
    }, [group, isOpen]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const promises = [];
            
            // Only update basic info if not active or if we want to sync it anyway.
            // The existing updateGroup endpoint handles logic for locked fields.
            promises.push(groupService.updateGroup(group.id, {
                groupName: data.groupName,
                maxMembers: data.maxMembers,
                gracePeriodDays: data.gracePeriodDays
            }));

            // Admin can always update fees and investment toggles
            promises.push(groupService.updateGroupFees(group.id, { 
                groupFeePercentage: data.groupFeePercentage 
            }));

            promises.push(groupService.toggleMicroInvestments(group.id, data.allowMicroInvestments));

            await Promise.all(promises);
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group', group.id] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            onClose();
        },
        onError: (err: any) => {
            setError(err?.response?.data?.message || t('auth.something_wrong'));
        },
    });

    if (!isOpen) return null;

    const isActive = group?.status === 'ACTIVE';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass-card w-full max-w-xl p-6 relative border border-white/10 shadow-2xl overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
                
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-95 z-10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-black text-white tracking-tight">{t('admin.edit_group_title')}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {isActive ? t('admin.locked_fields_msg') : t('admin.update_details_msg')}
                    </p>
                </div>

                {isActive && (
                    <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-2">
                        <span className="text-lg">⚠️</span> {t('admin.locked_warning')}
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold animate-shake">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('admin.group_name')}</label>
                        <input
                            type="text"
                            value={form.groupName}
                            onChange={e => setForm({ ...form, groupName: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                            placeholder={t('admin.group_name_placeholder')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('admin.max_members')}</label>
                            <input
                                type="number"
                                value={form.maxMembers}
                                min={1}
                                onChange={e => setForm({ ...form, maxMembers: Number(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('admin.grace_period')} ({t('admin.interval_days')})</label>
                            <input
                                type="number"
                                value={form.gracePeriodDays}
                                min={0}
                                onChange={e => setForm({ ...form, gracePeriodDays: Number(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 ml-1">{t('admin.group_fee_percentage')}</label>
                            <input
                                type="number"
                                value={form.groupFeePercentage}
                                min={0}
                                step={0.1}
                                max={10}
                                onChange={e => setForm({ ...form, groupFeePercentage: Number(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                                placeholder="e.g 2.5"
                            />
                            <p className="text-[9px] text-slate-600 ml-1">{t('admin.group_fee_desc')}</p>
                        </div>

                        <label className="flex items-center gap-4 cursor-pointer p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group/toggle">
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.allowMicroInvestments}
                                    onChange={e => setForm({ ...form, allowMicroInvestments: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{t('admin.enable_micro_investments')}</div>
                                <div className="text-[9px] text-slate-500 mt-1">{t('admin.micro_investments_desc')}</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex gap-3 pt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={() => mutation.mutate(form)}
                        disabled={mutation.isPending}
                        className="flex-[2] relative overflow-hidden group/btn px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        <span className="relative z-10">
                            {mutation.isPending ? t('common.saving') : t('common.save_changes')}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                    </button>
                </div>
            </div>
        </div>
    );
}
