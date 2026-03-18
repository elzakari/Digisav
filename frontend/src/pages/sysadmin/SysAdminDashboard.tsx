import { useQuery } from '@tanstack/react-query';
import { sysAdminService } from '@/services/sysadmin.service';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currencyFormatter';

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
            </header>

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
                    type="warning"
                />

                <StatCard
                    title={t('sysadmin.active_groups')}
                    value={stats?.groups?.active || 0}
                    type="info"
                />
                <StatCard
                    title={t('sysadmin.contributions_volume')}
                    value={formatCurrency(stats?.transactions?.totalContributionsVolume || 0)}
                    type="success"
                />
                <StatCard
                    title={t('sysadmin.payouts_volume')}
                    value={formatCurrency(stats?.transactions?.totalPayoutsVolume || 0)}
                    type="danger"
                />
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
                <p className="text-4xl font-black text-white tracking-tight">
                    {value}
                </p>
            </div>
        </div>
    );
}
