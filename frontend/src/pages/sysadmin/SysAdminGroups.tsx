import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sysAdminService } from '@/services/sysadmin.service';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';

export function SysAdminGroups() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning' | 'success' | 'info';
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => {},
        variant: 'warning'
    });

    const { data: groups, isLoading } = useQuery({
        queryKey: ['sysadmin-groups'],
        queryFn: () => sysAdminService.getAllGroups(),
    });

    const statusMutation = useMutation({
        mutationFn: ({ groupId, status }: any) => sysAdminService.updateGroupStatus(groupId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sysadmin-groups'] });
            toast.success(t('sysadmin.group_status_updated') || 'Group status updated');
        },
        onError: () => toast.error(t('sysadmin.group_status_failed') || 'Failed to update group'),
    });

    const handleStatusToggle = (groupId: string, currentStatus: string, groupName: string) => {
        const nextStatus = currentStatus === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
        const isClosing = nextStatus === 'CLOSED';
        
        setConfirmModal({
            isOpen: true,
            title: isClosing ? t('sysadmin.close_group_title') || 'Close Group' : t('sysadmin.reactivate_group_title') || 'Reactivate Group',
            description: isClosing 
                ? t('sysadmin.close_group_desc', { name: groupName }) || `Are you sure you want to close ${groupName}? Members will no longer be able to make contributions or payouts.`
                : t('sysadmin.reactivate_group_desc', { name: groupName }) || `Are you sure you want to reactivate ${groupName}?`,
            variant: isClosing ? 'danger' : 'success',
            onConfirm: () => {
                statusMutation.mutate({ groupId, status: nextStatus });
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-pulse text-indigo-400 font-medium text-lg">{t('common.loading')}</div>
        </div>
    );

    return (
        <div className="w-full space-y-10 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tight">{t('sysadmin.system_groups')}</h1>
                    <p className="text-slate-400">{t('sysadmin.groups_desc')}</p>
                </div>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white">{t('sysadmin.groups_registry')}</h2>
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">
                        {t('sysadmin.registered_count', { count: groups?.length || 0 }) || `${groups?.length || 0} Registered Groups`}
                    </span>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sysadmin.group_info')}</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sysadmin.administrator')}</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.members')}</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.type')}</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.status')}</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('sysadmin.moderation')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {groups?.map((g: any) => (
                                <tr key={g.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="font-semibold text-slate-200">{g.name}</div>
                                        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">ID: {g.id.split('-')[0]}...</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-sm font-medium text-slate-300">{g.admin.fullName}</div>
                                        <div className="text-xs text-slate-500">{g.admin.email}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{g._count.members}</span>
                                            <span className="text-[10px] text-slate-500 uppercase">{t('roles.members')}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-white/5 text-slate-400 border border-white/10">
                                            {g.type}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${g.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                            }`}>
                                            {g.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => handleStatusToggle(g.id, g.status, g.name)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${g.status === 'ACTIVE'
                                                    ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                                                }`}
                                        >
                                            {g.status === 'ACTIVE' ? t('sysadmin.close_group') || 'Close Group' : t('sysadmin.reactivate') || 'Reactivate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <ConfirmActionModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.description}
                variant={confirmModal.variant}
                isLoading={statusMutation.isPending}
            />
        </div>
    );
}
