import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/services/transaction.service';
import { useTranslation } from 'react-i18next';
import { publishAppEvent } from '@/lib/appEvents';

interface RecordPayoutModalProps {
    groupId: string;
    members: any[];
    currencyCode: string;
    isOpen: boolean;
    onClose: () => void;
}

export function RecordPayoutModal({ groupId, members, currencyCode, isOpen, onClose }: RecordPayoutModalProps) {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        memberId: '',
        amount: '',
        paymentMethod: 'BANK',
        paymentDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        notes: '',
    });

    const mutation = useMutation({
        mutationFn: (data: any) => transactionService.recordPayout(groupId, data.memberId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group-transactions', groupId] });
            queryClient.invalidateQueries({ queryKey: ['group-stats', groupId] });
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
            queryClient.invalidateQueries({ queryKey: ['group-dashboard', groupId] });
            publishAppEvent({ type: 'group_recordings_changed', groupId });
            onClose();
        },
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount),
            currencyCode,
            paymentDate: new Date(formData.paymentDate).toISOString(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass-card w-full max-w-xl p-6 relative border border-white/10 shadow-2xl overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all duration-700" />
                
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-95 z-10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-black text-white tracking-tight">{t('admin.record_payout')}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">{t('admin.record_payout_desc')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('admin.select_member')}</label>
                            <div className="relative group/select">
                                <select
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50 appearance-none transition-all group-hover/select:border-white/20"
                                    value={formData.memberId}
                                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                                >
                                    <option value="" className="bg-slate-900">{t('admin.choose_member')}</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id} className="bg-slate-900">
                                            {m.user.fullName}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('common.amount')}</label>
                            <div className="relative group/input">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-400/50 group-focus-within/input:text-rose-400 transition-colors uppercase">
                                    {currencyCode}
                                </div>
                                <input
                                    required
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all font-mono placeholder:text-slate-700"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('common.date')}</label>
                            <input
                                required
                                type="date"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all appearance-none"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('admin.payment_method')}</label>
                            <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 border border-white/5 rounded-xl">
                                {['MPESA', 'BANK', 'CASH'].map((method) => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, paymentMethod: method })}
                                        className={`py-1.5 text-[8px] font-black uppercase tracking-tighter rounded-lg border transition-all ${formData.paymentMethod === method
                                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-lg shadow-rose-500/10'
                                            : 'text-slate-500 hover:text-slate-300 border-transparent hover:bg-white/5'
                                            }`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                            {t('admin.ref_number')} <span className="text-[8px] opacity-40 lowercase">({t('common.optional')})</span>
                        </label>
                        <input
                            type="text"
                            placeholder={t('admin.ref_placeholder')}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700"
                            value={formData.referenceNumber}
                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                            {t('admin.notes')} <span className="text-[8px] opacity-40 lowercase">({t('common.optional')})</span>
                        </label>
                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all resize-none placeholder:text-slate-700 h-20"
                            placeholder="..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-[2] relative overflow-hidden group/btn px-6 py-3.5 bg-gradient-to-r from-rose-600 to-rose-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-rose-500/20 hover:shadow-rose-500/40 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <span className="relative z-10">
                                {mutation.isPending ? t('common.processing') : t('admin.record_transaction')}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
