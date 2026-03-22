import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { groupService } from '@/services/group.service';
import { authService } from '@/services/auth.service';
import { EditGroupModal } from '@/components/admin/EditGroupModal';
import { DeleteGroupDialog } from '@/components/admin/DeleteGroupDialog';
import { formatCurrency } from '@/utils/currencyFormatter';

export function AdminDashboard() {
  const { t } = useTranslation();
  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: groupService.getMyGroups,
  });

  const user = authService.getCurrentUser();
  const [cardMenuOpenId, setCardMenuOpenId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [deletingGroup, setDeletingGroup] = useState<any>(null);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-indigo-400 font-medium">{t('dashboard.loading_groups')}</div>
    </div>
  );

  if (error) return (
    <div className="glass-card p-8 text-center text-red-400">
      {t('dashboard.error_loading')}
    </div>
  );

  return (
    <div className="w-full space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">{t('dashboard.welcome_zakari', { name: user?.fullName })}</h1>
          <p className="text-slate-400">{t('dashboard.overview_active')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/admin/groups/create"
            className="glass-button btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('dashboard.create_new_group')}
          </Link>
        </div>
      </div>

      <AdminGlobalStats groups={groups || []} />

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-200">{t('dashboard.my_groups')}</h2>

        {groups && groups.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-4">
            <p className="text-slate-400">{t('dashboard.no_groups_found')}</p>
            <Link to="/admin/groups/create" className="text-indigo-400 hover:text-indigo-300 font-medium">
              {t('common.get_started')} →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups?.map((group: any) => (
              <div key={group.id} className="glass-card p-6 group hover:translate-y-[-4px] transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors flex-1">
                    {group.groupName}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${group.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      group.status === 'DRAFT' ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                      {t(`status.${group.status.toLowerCase()}`)}
                    </span>
                    {/* Three-dot context menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.preventDefault(); setCardMenuOpenId(cardMenuOpenId === group.id ? null : group.id); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors text-xl leading-none"
                      >⋮</button>
                      {cardMenuOpenId === group.id && (
                        <div className="absolute right-0 top-9 z-30 w-44 bg-slate-900/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                          <button
                            onClick={() => { setEditingGroup(group); setCardMenuOpenId(null); }}
                            className="w-full px-4 py-3 text-sm text-left text-slate-300 hover:bg-white/10 transition-colors border-b border-white/5 flex items-center gap-2"
                          >
                            ✏️ {t('dashboard.edit_settings')}
                          </button>
                          <button
                            onClick={() => { setDeletingGroup(group); setCardMenuOpenId(null); }}
                            className="w-full px-4 py-3 text-sm text-left text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                          >
                            {group.status === 'DRAFT' ? `🗑 ${t('common.delete')}` : `🔒 ${t('dashboard.close_group')}`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-slate-400 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{t('common.members')}</span>
                    <span className="text-slate-200 font-medium">{group._count?.members || 0} / {group.maxMembers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('common.contribution')}</span>
                    <span className="text-slate-200 font-medium">{formatCurrency(group.contributionAmount, 0, group.currencyCode)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('common.frequency')}</span>
                    <span className="text-slate-200 font-medium capitalize">{t(`frequency.${group.paymentFrequency.toLowerCase()}`)}</span>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5">
                  <Link
                    to={`/admin/groups/${group.id}`}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all"
                  >
                    {t('common.view_details')} <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CRUD Modals */}
      {editingGroup && (
        <EditGroupModal
          group={editingGroup}
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
        />
      )}
      {deletingGroup && (
        <DeleteGroupDialog
          group={deletingGroup}
          isOpen={!!deletingGroup}
          onClose={() => setDeletingGroup(null)}
        />
      )}
    </div>
  );
}

function AdminGlobalStats({ groups }: { groups: any[] }) {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: groupService.getAdminStats,
  });

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-28 glass-card rounded-2xl" />)}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard title={t('dashboard.active_groups')} value={stats?.totalGroups || 0} type="info" />
      <StatCard title={t('dashboard.members_managed')} value={stats?.totalMembers || 0} type="warning" />
      <StatCard
        title={t('dashboard.total_funds')}
        value={getFundsDisplayValue(stats, groups)}
        hint={getFundsHint(stats, groups, t)}
        type="success"
      />
    </div>
  );
}

function getFundsHint(stats: any, groups: any[], t: any) {
  const totalsByCurrency = stats?.totalsByCurrency as Array<{ currencyCode: string; total: number }> | undefined;
  if (totalsByCurrency && totalsByCurrency.length > 1) {
    return t('dashboard.multi_currency', 'Multiple currencies');
  }

  const currencies = Array.from(
    new Set((groups || []).map((g) => g.currencyCode).filter(Boolean))
  );
  if (currencies.length > 1) {
    return t('dashboard.multi_currency', 'Multiple currencies');
  }

  return undefined;
}

function getFundsDisplayValue(stats: any, groups: any[]) {
  const totalsByCurrency = stats?.totalsByCurrency as Array<{ currencyCode: string; total: number }> | undefined;
  if (totalsByCurrency && totalsByCurrency.length) {
    if (totalsByCurrency.length === 1) {
      return formatCurrency(totalsByCurrency[0].total || 0, 0, totalsByCurrency[0].currencyCode);
    }

    const primary = totalsByCurrency[0];
    const more = totalsByCurrency.length - 1;
    return `${formatCurrency(primary.total || 0, 0, primary.currencyCode)} +${more}`;
  }

  const currencies = Array.from(
    new Set((groups || []).map((g) => g.currencyCode).filter(Boolean))
  );
  if (currencies.length === 1) {
    return formatCurrency(stats?.totalFundsCollected || 0, 0, currencies[0]);
  }

  if (stats?.totalFundsCollected) {
    return String(stats.totalFundsCollected);
  }

  return formatCurrency(0, 0, currencies[0] || 'KES');
}

function StatCard({ title, value, hint, type = 'info' }: any) {
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
