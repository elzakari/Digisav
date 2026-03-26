import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sysAdminService } from '@/services/sysadmin.service';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { authService } from '@/services/auth.service';

export function SysAdminUsers() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const currentUser = authService.getCurrentUser();
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

    const { data: users, isLoading } = useQuery({
        queryKey: ['sysadmin-users'],
        queryFn: () => sysAdminService.getAllUsers(),
    });

    const updateMutation = useMutation({
        mutationFn: ({ userId, data }: any) => sysAdminService.updateUser(userId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sysadmin-users'] });
            toast.success(t('sysadmin.user_updated_success') || 'User updated successfully');
        },
        onError: () => toast.error(t('sysadmin.user_updated_failed') || 'Failed to update user'),
    });

    const deleteMutation = useMutation({
        mutationFn: (userId: string) => sysAdminService.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sysadmin-users'] });
            queryClient.invalidateQueries({ queryKey: ['sysadmin-stats'] });
            toast.success(t('sysadmin.user_deleted_success') || 'User deleted successfully');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error?.message || err?.response?.data?.message;
            toast.error(msg || t('sysadmin.user_deleted_failed') || 'Failed to delete user');
        },
    });

    const handleRoleChange = (userId: string, role: string, userName: string) => {
        setConfirmModal({
            isOpen: true,
            title: t('sysadmin.change_role_title', 'Change System Role'),
            description: String(t('sysadmin.change_role_desc', { name: userName, role, defaultValue: `Are you sure you want to change ${userName}'s role to ${role}? This will affect their permissions across the entire platform.` } as any)),
            variant: 'warning',
            onConfirm: () => {
                updateMutation.mutate({ userId, data: { role } });
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleStatusToggle = (userId: string, currentStatus: string, userName: string) => {
        const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        const isSuspending = nextStatus === 'SUSPENDED';
        
        setConfirmModal({
            isOpen: true,
            title: isSuspending ? t('sysadmin.suspend_user_title', 'Suspend User') : t('sysadmin.activate_user_title', 'Activate User'),
            description: isSuspending 
                ? String(t('sysadmin.suspend_user_desc', { name: userName, defaultValue: `Are you sure you want to suspend ${userName}? They will lose all access to the platform immediately.` } as any))
                : String(t('sysadmin.activate_user_desc', { name: userName, defaultValue: `Are you sure you want to reactivate ${userName}'s account?` } as any)),
            variant: isSuspending ? 'danger' : 'success',
            onConfirm: () => {
                updateMutation.mutate({ userId, data: { status: nextStatus } });
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeleteUser = (userId: string, userRole: string, userName: string, adminGroupsCount: number) => {
        if (userRole === 'SYS_ADMIN') {
            toast.error(t('sysadmin.cannot_delete_sysadmin', 'Cannot delete a System Admin user'));
            return;
        }

        if (currentUser?.id && currentUser.id === userId) {
            toast.error(t('sysadmin.cannot_delete_self', 'You cannot delete your own account'));
            return;
        }

        const extra = adminGroupsCount > 0
            ? t('sysadmin.delete_user_reassign', { count: adminGroupsCount, defaultValue: `Their ${adminGroupsCount} groups will be reassigned to you.` } as any)
            : '';

        setConfirmModal({
            isOpen: true,
            title: t('sysadmin.delete_user_title', 'Delete User'),
            description:
                String(t('sysadmin.delete_user_desc', { name: userName, defaultValue: `This will immediately disable ${userName}'s account and remove access. ${extra}` } as any)) ||
                `This will immediately disable ${userName}'s account and remove access. ${extra}`,
            variant: 'danger',
            onConfirm: () => {
                deleteMutation.mutate(userId);
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
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('sysadmin.platform_users')}</h1>
                    <p className="text-slate-400">{t('sysadmin.users_desc')}</p>
                </div>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="px-4 sm:px-6 md:px-8 py-5 md:py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white">{t('sysadmin.users_db')}</h2>
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">{t('sysadmin.global_roster')}</span>
                </div>

                <div className="md:hidden divide-y divide-white/5">
                    {users?.map((u: any) => (
                        <div key={u.id} className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="font-semibold text-white truncate">{u.fullName}</div>
                                    <div className="mt-1 text-xs text-slate-400 truncate">{u.email}</div>
                                    <div className="mt-1 text-[10px] text-slate-500 truncate">{u.phoneNumber}</div>
                                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                                            {u.status}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                            {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-shrink-0">
                                    <select
                                        value={u.role}
                                        onChange={(e) => handleRoleChange(u.id, e.target.value, u.fullName)}
                                        className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border bg-slate-950 outline-none focus:border-indigo-500/50 transition-all cursor-pointer ${u.role === 'SYS_ADMIN' ? 'text-indigo-300 border-indigo-500/25' : u.role === 'ADMIN' ? 'text-amber-300 border-amber-500/25' : 'text-slate-300 border-white/10'}`}
                                    >
                                        <option value="SYS_ADMIN">{t('roles.sys_admin') || 'System Admin'}</option>
                                        <option value="ADMIN">{t('roles.admin') || 'Group Admin'}</option>
                                        <option value="MEMBER">{t('roles.member') || 'Member'}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('sysadmin.admin_of')}</div>
                                    <div className="mt-1 text-sm font-bold text-white">{u._count.adminGroups}</div>
                                </div>
                                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('sysadmin.member_of')}</div>
                                    <div className="mt-1 text-sm font-bold text-white">{u._count.memberships}</div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleStatusToggle(u.id, u.status, u.fullName)}
                                    disabled={u.role === 'SYS_ADMIN'}
                                    className={`py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-colors border disabled:opacity-40 disabled:cursor-not-allowed ${u.status === 'ACTIVE'
                                            ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 border-rose-500/20'
                                            : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 border-emerald-500/20'
                                        }`}
                                >
                                    {u.status === 'ACTIVE' ? t('common.suspend') || 'Suspend' : t('common.activate') || 'Activate'}
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(u.id, u.role, u.fullName, u._count.adminGroups)}
                                    disabled={u.role === 'SYS_ADMIN' || (currentUser?.id && currentUser.id === u.id) || deleteMutation.isPending}
                                    className="py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-colors border bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 border-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {t('common.delete') || 'Delete'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sysadmin.name_email')}</th>
                                <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sysadmin.system_role')}</th>
                                <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sysadmin.admin_of')}</th>
                                <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sysadmin.member_of')}</th>
                                <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sysadmin.joined_date')}</th>
                                <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.status')}</th>
                                <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('sysadmin.security_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users?.map((u: any) => (
                                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 md:px-8 py-5">
                                        <div className="font-semibold text-slate-200">{u.fullName}</div>
                                        <div className="text-xs text-slate-400 mt-1">{u.email}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">{u.phoneNumber}</div>
                                    </td>
                                    <td className="px-6 md:px-8 py-5">
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value, u.fullName)}
                                            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border bg-slate-900 outline-none focus:border-indigo-500/50 transition-all cursor-pointer ${u.role === 'SYS_ADMIN' ? 'text-indigo-400 border-indigo-500/30' :
                                                u.role === 'ADMIN' ? 'text-amber-400 border-amber-500/30' :
                                                    'text-slate-400 border-slate-500/30'
                                                }`}
                                        >
                                            <option value="SYS_ADMIN">{t('roles.sys_admin') || 'System Admin'}</option>
                                            <option value="ADMIN">{t('roles.admin') || 'Group Admin'}</option>
                                            <option value="MEMBER">{t('roles.member') || 'Member'}</option>
                                        </select>
                                    </td>
                                    <td className="px-6 md:px-8 py-5 text-sm text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">{u._count.adminGroups}</span>
                                            <span className="text-[10px] text-slate-500 uppercase">{t('common.groups')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 md:px-8 py-5 text-sm text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">{u._count.memberships}</span>
                                            <span className="text-[10px] text-slate-500 uppercase">{t('common.groups')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 md:px-8 py-5 text-sm text-slate-400">
                                        {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 md:px-8 py-5">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                            'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                            }`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="px-6 md:px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleStatusToggle(u.id, u.status, u.fullName)}
                                                disabled={u.role === 'SYS_ADMIN'}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${u.status === 'ACTIVE'
                                                    ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                                                    }`}
                                            >
                                                {u.status === 'ACTIVE' ? t('common.suspend') || 'Suspend' : t('common.activate') || 'Activate'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.id, u.role, u.fullName, u._count.adminGroups)}
                                                disabled={u.role === 'SYS_ADMIN' || (currentUser?.id && currentUser.id === u.id) || deleteMutation.isPending}
                                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {t('common.delete') || 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {(!users || users.length === 0) && (
                    <div className="p-12 text-center text-slate-500 italic text-sm">
                        {t('sysadmin.no_users') || 'No users registered in the system.'}
                    </div>
                )}
            </div>
            
            <ConfirmActionModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.description}
                variant={confirmModal.variant}
                isLoading={updateMutation.isPending || deleteMutation.isPending}
            />
        </div>
    );
}
