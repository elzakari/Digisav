import { useQuery } from '@tanstack/react-query';
import { sysAdminService } from '@/services/sysadmin.service';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currencyFormatter';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Users, UsersRound } from 'lucide-react';

export function SysAdminDashboard() {
    const { t } = useTranslation();

    const { data: stats, isLoading } = useQuery({
        queryKey: ['sysadmin-stats'],
        queryFn: () => sysAdminService.getPlatformStats(),
    });

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-pulse text-indigo-400 font-medium text-lg">{t('common.loading')}</div>
        </div>
    );

    return (
        <div className="w-full space-y-10 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tight">{t('sysadmin.platform_overview')}</h1>
                    <p className="text-slate-400">{t('sysadmin.platform_desc')}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Link to="/sysadmin/users" className="glass-button btn-primary px-5 py-2.5 text-sm rounded-2xl flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t('sysadmin.platform_users', 'Platform Users')}
                        <ArrowRight className="w-4 h-4 opacity-70" />
                    </Link>
                    <Link to="/sysadmin/groups" className="glass-button btn-secondary px-5 py-2.5 text-sm rounded-2xl flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {t('sysadmin.groups_moderation', 'Groups Moderation')}
                        <ArrowRight className="w-4 h-4 opacity-70" />
                    </Link>
                </div>
            </header>

            <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <UsersRound className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm font-black text-white">{t('sysadmin.user_roles', 'User Roles')}</div>
                        <div className="text-xs text-slate-400">
                            {t('sysadmin.user_roles_desc', 'Platform-wide roles and status distribution')}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        SYS_ADMIN {stats?.userBreakdown?.roles?.SYS_ADMIN || 0}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        ADMIN {stats?.userBreakdown?.roles?.ADMIN || 0}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-500/10 text-slate-300 border border-white/10">
                        MEMBER {stats?.userBreakdown?.roles?.MEMBER || 0}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        ACTIVE {stats?.userBreakdown?.statuses?.ACTIVE || 0}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        SUSPENDED {stats?.userBreakdown?.statuses?.SUSPENDED || 0}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title={t('sysadmin.total_users')}
                    value={stats?.users?.total || 0}
                    type="info"
                />
                <StatCard
                    title={t('sysadmin.total_groups')}
                    value={stats?.groups?.total || 0}
                    type="success"
                />
                <StatCard
                    title={t('sysadmin.total_transactions')}
                    value={stats?.transactions?.totalCount || 0}
                    hint={stats?.transactions?.byType ? `CONTR ${stats.transactions.byType.CONTRIBUTION || 0} • PAY ${stats.transactions.byType.PAYOUT || 0} • FEE ${stats.transactions.byType.FEE || 0}` : undefined}
                    type="warning"
                />

                <StatCard
                    title={t('sysadmin.tontine_groups', 'Group Savings (Tontine)')}
                    value={stats?.groups?.byType?.TONTINE || 0}
                    hint={stats?.groups?.activeByType?.TONTINE ? `${stats.groups.activeByType.TONTINE} active` : '0 active'}
                    type="success"
                />
                <StatCard
                    title={t('sysadmin.micro_savings_groups', 'Micro-Savings Groups')}
                    value={stats?.groups?.byType?.MICRO_SAVINGS || 0}
                    hint={stats?.groups?.activeByType?.MICRO_SAVINGS ? `${stats.groups.activeByType.MICRO_SAVINGS} active` : '0 active'}
                    type="info"
                />
                <StatCard
                    title={t('sysadmin.active_groups')}
                    value={stats?.groups?.active || 0}
                    hint={typeof stats?.groups?.closed === 'number' ? `${stats.groups.closed} closed` : undefined}
                    type="warning"
                />

                <StatCard
                    title={t('sysadmin.contributions_volume')}
                    value={formatVolume(stats?.transactions?.totalContributionsVolume || 0, stats?.transactions?.contributionsByCurrency)}
                    hint={stats?.transactions?.contributionsByCurrency?.length > 1 ? `${stats.transactions.contributionsByCurrency.length} currencies` : undefined}
                    type="success"
                />
                <StatCard
                    title={t('sysadmin.payouts_volume')}
                    value={formatVolume(stats?.transactions?.totalPayoutsVolume || 0, stats?.transactions?.payoutsByCurrency)}
                    hint={stats?.transactions?.payoutsByCurrency?.length > 1 ? `${stats.transactions.payoutsByCurrency.length} currencies` : undefined}
                    type="danger"
                />
                <StatCard
                    title={t('sysadmin.commissions_volume', 'Commissions Volume')}
                    value={formatVolume(stats?.transactions?.totalFeesVolume || 0, stats?.transactions?.feesByCurrency)}
                    hint={stats?.transactions?.feesByCurrency?.length > 1 ? `${stats.transactions.feesByCurrency.length} currencies` : undefined}
                    type="warning"
                />
            </div>
        </div>
    );
}

function formatVolume(total: number, byCurrency?: Array<{ currencyCode: string; total: number }>) {
    if (!byCurrency || byCurrency.length === 0) {
        return String(total || 0);
    }
    return formatCurrency(total || 0, 0, byCurrency[0]?.currencyCode);
}

function StatCard({ title, value, hint, type = 'info' }: any) {
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
                <p className="text-4xl font-black text-white tracking-tight">
                    {value}
                </p>
            </div>
            {hint ? (
                <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {hint}
                </div>
            ) : null}
        </div>
    );
}
