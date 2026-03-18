import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { groupService } from '@/services/group.service';
import { useTranslation } from 'react-i18next';

interface InviteMembersModalProps {
    groupId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function InviteMembersModal({ groupId, isOpen, onClose }: InviteMembersModalProps) {
    const { t } = useTranslation();
    const [invitationLink, setInvitationLink] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [phoneData, setPhoneData] = useState({ phoneNumber: '', fullName: '' });

    const createLinkMutation = useMutation({
        mutationFn: () => groupService.createInvitation(groupId, { maxUses: 10, expiryDays: 7 }),
        onSuccess: (data: any) => {
            const baseUrl = window.location.origin;
            setInvitationLink(`${baseUrl}/join?token=${data.token}`);
        },
    });

    const sendPhoneMutation = useMutation({
        mutationFn: (data: any) => groupService.sendPhoneInvitation(groupId, {
            phoneNumber: data.phoneNumber,
            recipientName: data.fullName
        }),
        onSuccess: () => {
            alert(t('admin.scheduling_delivery'));
            onClose();
        },
    });

    if (!isOpen) return null;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(invitationLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass-card w-full max-w-xl p-6 relative border border-white/10 shadow-2xl overflow-hidden group">
                {/* Decorative background element */}
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
                    <h2 className="text-xl font-black text-white tracking-tight">{t('dashboard.invite_members')}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">{t('admin.invite_members_desc')}</p>
                </div>

                <div className="space-y-6">
                    {/* Link Generation */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 ml-1">{t('admin.share_link')}</label>
                        {!invitationLink ? (
                            <button
                                onClick={() => createLinkMutation.mutate()}
                                disabled={createLinkMutation.isPending}
                                className="w-full py-4 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl text-slate-400 hover:border-indigo-500/50 hover:text-indigo-300 transition-all group/link relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-indigo-500/0 group-hover/link:bg-indigo-500/5 transition-colors" />
                                <div className="relative flex flex-col items-center gap-1.5">
                                    <svg className="w-6 h-6 opacity-40 group-hover/link:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <span className="text-[10px] font-bold tracking-widest uppercase">{createLinkMutation.isPending ? t('admin.generating') : t('admin.generate_link')}</span>
                                </div>
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        readOnly
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white font-mono truncate focus:outline-none"
                                        value={invitationLink}
                                    />
                                    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0f111a] to-transparent rounded-r-xl" />
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className={`px-4 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black tracking-widest uppercase ${copySuccess 
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10' 
                                        : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30'
                                    }`}
                                >
                                    {copySuccess ? t('admin.copied') : t('admin.copy')}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/5"></div>
                        </div>
                        <div className="relative flex justify-center text-[8px] uppercase tracking-[0.3em] font-black text-slate-700">
                            <span className="bg-[#12141c] px-4">OR</span>
                        </div>
                    </div>

                    {/* Direct Invitation Form */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            sendPhoneMutation.mutate(phoneData);
                        }}
                        className="space-y-4"
                    >
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 ml-1">{t('admin.direct_invite')}</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="relative group/input">
                                    <input
                                        required
                                        placeholder={t('admin.full_name')}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                                        value={phoneData.fullName}
                                        onChange={(e) => setPhoneData({ ...phoneData, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="relative group/input">
                                    <input
                                        required
                                        placeholder="+254..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono placeholder:text-slate-700"
                                        value={phoneData.phoneNumber}
                                        onChange={(e) => setPhoneData({ ...phoneData, phoneNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={sendPhoneMutation.isPending}
                            className="w-full relative overflow-hidden group/btn px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {sendPhoneMutation.isPending ? t('common.sending') : t('admin.send_sms')}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
