import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { groupService } from '@/services/group.service';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

interface SendNotificationModalProps {
    groupId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function SendNotificationModal({ groupId, isOpen, onClose }: SendNotificationModalProps) {
    const { t } = useTranslation();
    const [form, setForm] = useState({ title: '', body: '' });
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: (data: any) => groupService.sendGroupNotification(groupId, data),
        onSuccess: (result: any) => {
            setForm({ title: '', body: '' });
            const count = result?.count ?? result?.data?.count;
            if (typeof count === 'number' && count === 0) {
                toast.error(t('admin.no_recipients', 'No members to notify'));
            } else if (typeof count === 'number') {
                toast.success(String(t('admin.notification_sent_count', { count, defaultValue: `Notification sent to ${count} members` } as any)));
            } else {
                toast.success(t('admin.notification_sent', 'Notification sent successfully'));
            }
            onClose();
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error?.message || err?.response?.data?.message;
            setError(msg || t('admin.notification_failed', 'Failed to send notification'));
        },
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass-card w-full max-w-lg p-6 relative border border-white/10 shadow-2xl overflow-hidden group">
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
                    <h2 className="text-xl font-black text-white tracking-tight">{t('admin.send_notification')}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">{t('admin.send_notification_desc')}</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold animate-shake">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('common.title')}</label>
                        <input
                            type="text"
                            value={form.title}
                            maxLength={50}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                            placeholder={t('admin.notification_title_placeholder')}
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{t('common.message')}</label>
                        <textarea
                            value={form.body}
                            rows={3}
                            maxLength={255}
                            onChange={e => setForm({ ...form, body: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all resize-none placeholder:text-slate-700 h-24"
                            placeholder={t('admin.notification_body_placeholder')}
                            required
                        />
                        <div className="flex justify-end pr-1">
                            <span className={`text-[10px] font-bold ${form.body.length > 240 ? 'text-rose-400' : 'text-slate-600'}`}>
                                {form.body.length}/255
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={() => {
                          if (form.title.trim() && form.body.trim()) {
                            mutation.mutate(form)
                          } else {
                            setError(t('admin.title_body_required', 'Title and message are required'));
                          }
                        }}
                        disabled={mutation.isPending}
                        className="flex-[2] relative overflow-hidden group/btn px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        <span className="relative z-10">
                            {mutation.isPending ? t('common.sending') : t('admin.send_message')}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                    </button>
                </div>
            </div>
        </div>
    );
}
