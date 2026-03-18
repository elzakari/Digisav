import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService } from '@/services/group.service';
import { useTranslation } from 'react-i18next';

interface EditMemberModalProps {
    groupId: string;
    member: any;
    isOpen: boolean;
    onClose: () => void;
}

export function EditMemberModal({ groupId, member, isOpen, onClose }: EditMemberModalProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        fullName: '',
        nationalId: '',
        payoutPosition: '',
        accountNumber: '',
        status: 'ACTIVE',
        isSavingsGroupMember: true,
        isMicroSavingsMember: false,
        isMicroInvestmentMember: false,
        isCurrentInAll: false
    });

    useEffect(() => {
        if (member) {
            setFormData({
                fullName: member.user?.fullName || '',
                nationalId: member.nationalId || '',
                payoutPosition: member.payoutPosition?.toString() || '',
                accountNumber: member.accountNumber || '',
                status: member.status || 'ACTIVE',
                isSavingsGroupMember: member.isSavingsGroupMember ?? true,
                isMicroSavingsMember: member.isMicroSavingsMember ?? false,
                isMicroInvestmentMember: member.isMicroInvestmentMember ?? false,
                isCurrentInAll: member.isCurrentInAll ?? false
            });
        }
    }, [member]);

    const mutation = useMutation({
        mutationFn: (data: any) => groupService.updateMember(member.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
            onClose();
        },
    });

    if (!isOpen || !member) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            payoutPosition: formData.payoutPosition ? parseInt(formData.payoutPosition) : null
        });
    };

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
                    <h2 className="text-xl font-black text-white tracking-tight">{t('common.edit')} {t('common.member')}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">{t('admin.edit_member_desc')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5 opacity-60">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('common.member_name')}</label>
                        <input
                            disabled
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-400 cursor-not-allowed"
                            value={formData.fullName}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('common.national_id')}</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono placeholder:text-slate-700"
                                value={formData.nationalId}
                                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('common.payout_order')}</label>
                            <input
                                type="number"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                                value={formData.payoutPosition}
                                onChange={(e) => setFormData({ ...formData, payoutPosition: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('common.acc_number')}</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        />
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 ml-1">{t('admin.member_classification') || 'Member Classification'}</label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                                { key: 'isSavingsGroupMember', label: t('admin.savings_group') || 'Savings Group' },
                                { key: 'isMicroSavingsMember', label: t('admin.micro_savings') || 'Micro-Savings' },
                                { key: 'isMicroInvestmentMember', label: t('admin.micro_investment') || 'Micro-Investment' },
                            ].map((item) => (
                                <label key={item.key} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all group/toggle">
                                    <div className="relative inline-flex items-center cursor-pointer scale-75 origin-left">
                                        <input
                                            type="checkbox"
                                            checked={(formData as any)[item.key]}
                                            onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-200 uppercase tracking-widest transition-colors">{item.label}</span>
                                </label>
                            ))}

                            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20 transition-all group/toggle">
                                <div className="relative inline-flex items-center cursor-pointer scale-75 origin-left">
                                    <input
                                        type="checkbox"
                                        checked={formData.isCurrentInAll}
                                        onChange={(e) => setFormData({ ...formData, isCurrentInAll: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                                </div>
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('admin.current_in_all')}</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-[2] relative overflow-hidden group/btn px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <span className="relative z-10">
                                {mutation.isPending ? t('common.saving') : t('common.save_changes')}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
