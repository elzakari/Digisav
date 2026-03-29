import { useQuery } from '@tanstack/react-query';
import { groupService } from '@/services/group.service';
import { authService } from '@/services/auth.service';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currencyFormatter';

export function MemberDashboard() {
    const { t } = useTranslation();
    const user = authService.getCurrentUser();

    const { data: groups, isLoading: groupsLoading } = useQuery({
        queryKey: ['my-groups'],
        queryFn: () => groupService.getMyGroups(),
        refetchOnWindowFocus: 'always',
        refetchOnReconnect: true,
        refetchInterval: 60_000,
    });

    if (groupsLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-pulse text-indigo-400 font-medium text-lg">{t('common.syncing_groups')}</div>
        </div>
    );

    return (
        <div className="w-full space-y-10 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tight">{t('dashboard.welcome_zakari', { name: user?.fullName })}</h1>
                    <p className="text-slate-400">{t('dashboard.track_savings')}</p>
                </div>
            </header>

            <MemberGlobalStats />

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-slate-200">{t('dashboard.my_savings_groups')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups?.length === 0 ? (
                        <div className="col-span-full glass-card p-16 text-center space-y-6 border-dashed bg-white/[0.01]">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                                <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">{t('dashboard.join_first_group')}</h3>
                                <p className="text-slate-400 max-w-sm mx-auto">{t('dashboard.use_invite_link')}</p>
                            </div>
                        </div>
                    ) : (
                        groups?.map((group: any) => (
                            <GroupCard key={group.id} group={group} />
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}

function GroupCard({ group }: { group: any }) {
    const { t } = useTranslation();
    return (
        <Link
            to={`/member/groups/${group.id}`}
            className="glass-card p-6 group hover:translate-y-[-4px] transition-all duration-300"
        >
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                        {group.groupPrefix}
                    </span>
                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors mt-1">
                        {group.groupName}
                    </h3>
                </div>
                <StatusBadge status={group.status} />
            </div>

            <div className="space-y-5">
                <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">{t('common.contribution')}</span>
                        <span className="text-white font-bold">{formatCurrency(Number(group.contributionAmount))}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">{t('common.frequency')}</span>
                        <span className="text-indigo-300 font-bold capitalize">{group.paymentFrequency.toLowerCase()}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <div className="flex -space-x-2.5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-7 w-7 rounded-full border-2 border-[#1e1b4b] bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-300 overflow-hidden">
                                <span className="opacity-0">U</span>
                            </div>
                        ))}
                    </div>
                    <span className="text-[11px] text-slate-400 font-semibold tracking-wide">
                        {t('common.active_members_count', { count: group._count?.members || 0 })}
                    </span>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-end">
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-400 transition-colors uppercase tracking-widest">
                    {t('common.manage_participation')}
                </span>
            </div>
        </Link>
    );
}

function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation();
    const styles: any = {
        ACTIVE: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        DRAFT: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
        CLOSED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    };
    return (
        <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest border ${styles[status] || styles.DRAFT}`}>
            {status === 'ACTIVE' ? t('common.active') : status === 'DRAFT' ? t('common.draft') : status === 'CLOSED' ? t('common.closed') : status}
        </span>
    );
}

function MemberGlobalStats() {
    const { t } = useTranslation();
    const { data: stats, isLoading } = useQuery({
        queryKey: ['member-stats'],
        queryFn: groupService.getMemberStats,
        refetchOnWindowFocus: 'always',
        refetchOnReconnect: true,
        refetchInterval: 30_000,
    });

    if (isLoading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2].map(i => <div key={i} className="h-28 glass-card rounded-2xl" />)}
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard title={t('dashboard.active_savings_groups')} value={stats?.totalActiveGroups || 0} type="info" />
            <StatCard title={t('dashboard.total_saved_personal')} value={formatCurrency(stats?.totalAmountSaved || 0)} type="success" />
        </div>
    );
}

function StatCard({ title, value, type = 'info' }: any) {
    const styles: any = {
        info: 'from-indigo-500/20 to-transparent text-indigo-400 border-indigo-500/20',
        success: 'from-emerald-500/20 to-transparent text-emerald-400 border-emerald-500/20',
        warning: 'from-amber-500/20 to-transparent text-amber-400 border-amber-500/20',
    };

    return (
        <div className={`glass-card p-6 bg-gradient-to-br ${styles[type]} border`}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{title}</h3>
            <div className="flex items-baseline gap-1">
                <p className="text-3xl font-black text-white tracking-tight">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
            </div>
        </div>
    );
}
