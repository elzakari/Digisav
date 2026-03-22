import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { groupService } from '@/services/group.service';
import { useTranslation } from 'react-i18next';
import { contributionService } from '@/services/contribution.service';
import { authService } from '@/services/auth.service';
import { formatCurrency } from '@/utils/currencyFormatter';
import { savingsService } from '@/services/savings.service';

export function MemberGroupDashboard() {
    const { t } = useTranslation();
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const queryClient = useQueryClient();

    const { data: group, isLoading: groupLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => groupService.getGroupById(groupId!),
        enabled: !!groupId,
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['group-stats', groupId],
        queryFn: () => contributionService.getGroupStats(groupId!),
        enabled: !!groupId,
    });

    const { data: contributions, isLoading: historyLoading } = useQuery({
        queryKey: ['group-contributions', groupId],
        queryFn: () => contributionService.getContributionHistory(groupId!),
        enabled: !!groupId,
    });

    const withdrawalMutation = useMutation({
        mutationFn: (goalId: string) => savingsService.withdrawGoal(goalId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
            alert(t('savings.withdrawal_requested') || 'Withdrawal request submitted!');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || t('savings.action_error', { action: 'request withdrawal' }));
        }
    });

    // Extract current member from group members list
    const currentMember = group?.members?.find((m: any) => m.userId === currentUser?.id);
    const myContributions = contributions?.filter((c: any) => c.member.userId === currentUser?.id) || [];
    const myTotalContributions = myContributions.reduce((sum: number, c: any) => sum + Number(c.amount), 0);

    useEffect(() => {
        if (!groupLoading && !group) {
            navigate('/overview');
        }
    }, [group, groupLoading, navigate]);

    if (groupLoading || statsLoading || historyLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-pulse text-indigo-400 font-medium text-lg">{t('common.loading')}</div>
        </div>
    );

    return (
        <div className="w-full space-y-10 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-1">
                        <Link to="/member/dashboard" className="hover:text-indigo-300 transition-colors">{t('common.member')}</Link>
                        <span>/</span>
                        <span className="text-slate-400">{group?.groupName}</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">{t('dashboard.members_payout')}</h1>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title={t('dashboard.total_collected')}
                    value={formatCurrency(stats?.totalCollected || 0, 0, stats?.currencyCode)}
                    type="info"
                />
                <StatCard
                    title={t('dashboard.my_contributions')}
                    value={formatCurrency(myTotalContributions, 0, group?.currencyCode)}
                    type="success"
                />
                <StatCard
                    title={t('common.payout_order')}
                    value={currentMember?.payoutPosition ? `#${currentMember.payoutPosition}` : t('common.pending')}
                    type="warning"
                />
                <StatCard
                    title={t('common.status')}
                    value={group?.status === 'ACTIVE' ? t('common.active') : group?.status === 'DRAFT' ? t('common.draft') : group?.status === 'CLOSED' ? t('common.closed') : group?.status}
                    type={group?.status === 'ACTIVE' ? 'success' : 'info'}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Micro-Savings Account Section */}
                 <div className="glass-card p-8 bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <svg className="w-24 h-24 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14H11V11h2v5zm0-7H11V7h2v2z" />
                         </svg>
                     </div>
 
                     <div className="relative z-10 space-y-6">
                         <div className="flex justify-between items-start">
                             <div>
                                 <h3 className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-1">{t('dashboard.my_micro_savings') || 'My Micro-Savings Account'}</h3>
                                 <p className="text-slate-400 text-xs">{t('savings.personal_savings_subtitle')}</p>
                             </div>
                             <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-rose-500/30">
                                 {t('admin.micro_savings')}
                             </span>
                         </div>
 
                         <div>
                             <p className="text-4xl font-black text-white tracking-tighter">
                                 {formatCurrency(currentMember?.user?.savingsGoals?.find((g: any) => g.category === 'MICRO_SAVINGS')?.currentAmount || 0, 0, group?.currencyCode)}
                             </p>
                             <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-widest italic">{t('admin.current_in_all')}</p>
                         </div>
 
                         <div className="flex gap-3 pt-2">
                             <button
                                 disabled={withdrawalMutation.isPending || !currentMember?.user?.savingsGoals?.find((g: any) => g.category === 'MICRO_SAVINGS')?.currentAmount}
                                 onClick={() => {
                                     const goal = currentMember?.user?.savingsGoals?.find((g: any) => g.category === 'MICRO_SAVINGS');
                                     if (goal && window.confirm(t('savings.withdraw_confirm', { 
                                         amount: goal.currentAmount, 
                                         currency: goal.currencyCode,
                                         percent: 2,
                                         fee: (Number(goal.currentAmount) * 0.02).toFixed(2),
                                         net: (Number(goal.currentAmount) * 0.98).toFixed(2)
                                     }))) {
                                         withdrawalMutation.mutate(goal.id);
                                     }
                                 }}
                                 className="glass-button btn-primary flex-1 py-3 text-[10px] font-bold uppercase tracking-widest"
                             >
                                 {withdrawalMutation.isPending ? t('common.processing') : t('dashboard.record_payout') || 'Request Payout'}
                             </button>
                             <Link to="/overview" className="glass-button btn-secondary px-6 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center">
                                 {t('dashboard.portfolio_analytics') || 'Details'}
                             </Link>
                         </div>
                     </div>
                 </div>
 
                 {/* Group Participation Card */}
                 <div className="glass-card p-8 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 relative overflow-hidden group">
                     <div className="relative z-10 space-y-6">
                         <div className="flex justify-between items-start">
                             <div>
                                 <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">{t('savings.group_savings_label')}</h3>
                                 <p className="text-slate-400 text-xs">{t('dashboard.track_savings')}</p>
                             </div>
                             <span className={`px-2 py-1 ${!currentUser?.optedOutOfGroupSavings ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'} text-[10px] font-bold uppercase tracking-widest rounded-lg border`}>
                                 {!currentUser?.optedOutOfGroupSavings ? t('common.active') : t('common.inactive')}
                             </span>
                         </div>
 
                         <div>
                             <p className="text-4xl font-black text-white tracking-tighter">
                                 {formatCurrency(myTotalContributions, 0, group?.currencyCode)}
                             </p>
                             <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-widest italic">{t('dashboard.my_contributions')}</p>
                         </div>
 
                         <div className="pt-2">
                             <Link to="/member/savings" className="text-indigo-400 text-xs font-bold uppercase tracking-widest hover:text-indigo-300 transition-colors">
                                 {t('dashboard.manage_participation')}
                             </Link>
                         </div>
                     </div>
                 </div>
             </div>

            {/* Contribution History Table */}
            <div className="glass-card overflow-hidden">
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white">{t('dashboard.my_contributions')}</h2>
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">{t('common.active')}</span>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.date')}</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.amount')}</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.method')}</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {myContributions?.map((c: any) => (
                                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5 text-sm text-slate-300">
                                        {new Date(c.paymentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-8 py-5 text-sm font-semibold text-slate-200">
                                        {formatCurrency(c.amount, 0, c.currencyCode)}
                                    </td>
                                    <td className="px-8 py-5 text-sm text-slate-400 uppercase tracking-tighter">
                                        {c.paymentMethod}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${c.status === 'PAID' || c.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                            'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                            }`}>
                                            {c.status === 'PAID' ? t('common.active') : c.status === 'OVERDUE' ? t('common.overdue') : c.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {(!myContributions || myContributions.length === 0) && (
                    <div className="p-12 text-center text-slate-500 italic text-sm">
                        {t('dashboard.no_transactions')}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, type = 'info' }: any) {
    const styles: any = {
        info: 'from-indigo-500/20 to-transparent text-indigo-400 border-indigo-500/20',
        success: 'from-emerald-500/20 to-transparent text-emerald-400 border-emerald-500/20',
        warning: 'from-amber-500/20 to-transparent text-amber-400 border-amber-500/20',
        danger: 'from-rose-500/20 to-transparent text-rose-400 border-rose-500/20',
    };

    return (
        <div className={`glass-card p-6 bg-gradient-to-br ${styles[type]} border`}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{title}</h3>
            <div className="flex items-baseline gap-1">
                <p className="text-3xl font-black text-white tracking-tight">
                    {value}
                </p>
            </div>
        </div>
    );
}
