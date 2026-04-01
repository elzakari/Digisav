import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { groupService } from '@/services/group.service';
import { RecordContributionModal } from '@/components/admin/RecordContributionModal';
import { RecordPayoutModal } from '@/components/admin/RecordPayoutModal';
import { EditRecordModal } from '@/components/admin/EditRecordModal';
import { transactionService } from '@/services/transaction.service';
import { authService } from '@/services/auth.service';
import { EditGroupModal } from '@/components/admin/EditGroupModal';
import { DeleteGroupDialog } from '@/components/admin/DeleteGroupDialog';
import { EditMemberModal } from '@/components/admin/EditMemberModal';
import { WithdrawalRequestsTab } from '@/components/admin/WithdrawalRequestsTab';
import { SendNotificationModal } from '@/components/admin/SendNotificationModal';
import { InviteMembersModal } from '@/components/admin/InviteMembersModal';
import { ReportsModal } from '@/components/admin/ReportsModal';
import { formatCurrency } from '@/utils/currencyFormatter';
import { KpiCard } from '@/components/admin/dashboard/KpiCard';
import { ContributionsStatusPanel } from '@/components/admin/dashboard/ContributionsStatusPanel';
import { RecentActivityPanel } from '@/components/admin/dashboard/RecentActivityPanel';
import { DashboardPeriodSelector, type DashboardPeriod } from '@/components/admin/dashboard/DashboardPeriodSelector';
import { MemberStatusTable } from '@/components/admin/dashboard/MemberStatusTable';
import { DashboardInsightsPanel } from '@/components/admin/dashboard/DashboardInsightsPanel';
import { BarChart3, Bell, Coins, FileDown, Settings2, ShieldAlert, Trash2, UserPlus, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function GroupDashboard() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const isSystemAdmin = user?.role === 'SYS_ADMIN';

  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>(() => {
    const today = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    return { kind: 'current_cycle', fallbackRange: { from: toIso(from), to: toIso(today) } };
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: [
      'group-dashboard',
      groupId,
      dashboardPeriod.kind,
      dashboardPeriod.kind === 'range' ? dashboardPeriod.from : undefined,
      dashboardPeriod.kind === 'range' ? dashboardPeriod.to : undefined,
    ],
    queryFn: () =>
      groupService.getGroupDashboard(
        groupId!,
        dashboardPeriod.kind === 'range'
          ? { period: 'range', from: dashboardPeriod.from, to: dashboardPeriod.to }
          : { period: 'current_cycle' }
      ),
    enabled: !!groupId,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    refetchInterval: 15_000,
  });

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupById(groupId!),
    enabled: !!groupId,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!groupLoading && groupId) {
      if (!group) {
        navigate('/admin/dashboard');
      } else if (group.adminUserId !== user?.id && !isSystemAdmin) {
        navigate('/overview');
      }
    }
  }, [group, groupLoading, groupId, navigate, user, isSystemAdmin]);

  const { data: transactions, isLoading: historyLoading } = useQuery({
    queryKey: ['group-transactions', groupId],
    queryFn: () => transactionService.getGroupTransactions(groupId!),
    enabled: !!groupId,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    refetchInterval: 15_000,
  });

  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'members' | 'requests'>('transactions');
  const [memberMenuOpenId, setMemberMenuOpenId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [cycleFilter, setCycleFilter] = useState<'due' | 'paid' | 'past_due'>('due');

  const toggleSelectMember = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const toggleSelectAll = (members: any[]) => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map(m => m.id));
    }
  };

  const handleBulkUpdate = async (data: any) => {
    if (selectedMemberIds.length === 0) return;
    
    setIsBulkProcessing(true);
    try {
      await groupService.bulkUpdateMembers(groupId!, selectedMemberIds, data);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      setSelectedMemberIds([]);
      alert(t('common.bulk_update_success') || 'Bulk update successful');
    } catch (err: any) {
      console.error('Bulk update failed', err);
      alert(t('common.bulk_update_error') || 'Failed to update members');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const queryClient = useQueryClient();

  const handleMemberAction = async (
    action: 'edit' | 'remove' | 'approve' | 'reject' | 'suspend' | 'activate',
    member: any
  ) => {
    if (action === 'edit') {
      setSelectedMember(member);
      setIsEditMemberModalOpen(true);
      setMemberMenuOpenId(null);
      return;
    }

    const confirmText: Record<string, string> = {
      remove: t('common.are_you_sure_remove_member') || 'Are you sure you want to remove this member?',
      approve: t('admin.approve_member_confirm') || 'Approve this member and activate their access?',
      reject: t('admin.reject_member_confirm') || 'Reject this member request? They will be set inactive.',
      suspend: t('admin.suspend_member_confirm') || 'Suspend this member? They will lose access to the group.',
      activate: t('admin.activate_member_confirm') || 'Activate this member?',
    };

    if (!window.confirm(confirmText[action] || t('common.are_you_sure'))) {
      setMemberMenuOpenId(null);
      return;
    }

    try {
      if (action === 'remove') {
        await groupService.removeMember(member.id);
      } else if (action === 'approve') {
        await groupService.approveMember(member.id);
      } else if (action === 'reject') {
        await groupService.rejectMember(member.id);
      } else if (action === 'suspend') {
        await groupService.suspendMember(member.id);
      } else if (action === 'activate') {
        await groupService.updateMember(member.id, { status: 'ACTIVE' });
      }

      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success(t('common.saved') || 'Saved');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message;
      toast.error(msg || t('common.error') || 'Action failed');
      console.error('Member action failed', err);
    } finally {
      setMemberMenuOpenId(null);
    }
  };

  const handleDownloadReport = () => {
    setIsReportsModalOpen(true);
  };

  if (dashboardLoading || historyLoading || groupLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-indigo-400 font-medium text-lg">{t('common.loading')}</div>
    </div>
  );

  const currencyCode = dashboard?.group?.currencyCode || group?.currencyCode || 'KES';
  const groupType = dashboard?.group?.groupType || group?.groupType;

  return (
    <div className="w-full space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-1">
            <Link to="/admin/dashboard" className="hover:text-indigo-300 transition-colors">{t('common.admin')}</Link>
            <span>/</span>
            <span className="text-slate-400">{t('common.dashboard')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {group?.groupPrefix ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                {group.groupPrefix}
              </span>
            ) : null}
            {groupType ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/80">
                {groupType === 'MICRO_SAVINGS'
                  ? String(t('admin_dashboard.group_type_micro_savings', { defaultValue: 'Micro‑Savings' } as any))
                  : String(t('admin_dashboard.group_type_tontine', { defaultValue: 'Tontine' } as any))}
              </span>
            ) : null}
            {dashboard?.common?.dataAsOf ? (
              <span className="text-xs text-white/50">
                {String(t('admin_dashboard.data_as_of', { date: new Date(dashboard.common.dataAsOf).toLocaleString(), defaultValue: 'Data as of {{date}}' } as any))}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3">
          <DashboardPeriodSelector value={dashboardPeriod} onChange={setDashboardPeriod} />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="glass-button btn-primary px-5 py-2.5 text-sm rounded-2xl flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {t('dashboard.invite_members')}
            </button>
            <button
              onClick={() => setIsContributionModalOpen(true)}
              className="glass-button btn-success px-5 py-2.5 text-sm rounded-2xl flex items-center gap-2"
            >
              <Coins className="w-4 h-4" />
              {t('dashboard.record_payment')}
            </button>
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              className="glass-button btn-warning px-5 py-2.5 text-sm rounded-2xl flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              {t('dashboard.record_payout') || 'Record Payout'}
            </button>
            <button
              onClick={handleDownloadReport}
              className="glass-button btn-secondary px-5 py-2.5 text-sm rounded-2xl flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              {t('dashboard.export_report')}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="glass-button btn-secondary px-4 py-2 text-xs rounded-2xl flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              {t('common.send_notification') || 'Send Notification'}
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="glass-button btn-info px-4 py-2 text-xs rounded-2xl flex items-center gap-2"
            >
              <Settings2 className="w-4 h-4" />
              {t('dashboard.edit_settings')}
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="glass-button btn-danger px-4 py-2 text-xs rounded-2xl flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {(group?.status === 'DRAFT' || isSystemAdmin) ? t('dashboard.delete_group') : t('dashboard.close_group')}
            </button>
          </div>
        </div>
      </div>

      {dashboard?.common ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Active members"
            value={`${dashboard.common.activeMembersCount || 0}`}
            icon={<UserPlus className="w-5 h-5" />}
          />
          <KpiCard
            title={t('dashboard.total_collected')}
            value={formatCurrency(dashboard.common.totalCollected?.amount || 0, 0, currencyCode)}
            icon={<Wallet className="w-5 h-5" />}
            onClick={() => setCycleFilter('paid')}
          />
          <KpiCard
            title={t('dashboard.outstanding')}
            value={formatCurrency(dashboard.common.totalOutstanding?.amount || 0, 0, currencyCode)}
            icon={<BarChart3 className="w-5 h-5" />}
            onClick={() => setCycleFilter('due')}
          />
          <KpiCard
            title="Past due"
            value={`${dashboard.common.pastDueMembersCount || 0}`}
            icon={<ShieldAlert className="w-5 h-5" />}
            onClick={() => setCycleFilter('past_due')}
          />
        </div>
      ) : null}

      {groupType === 'TONTINE' && dashboard?.tontine ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Expected pot"
            value={formatCurrency(dashboard.tontine.expectedPot?.amount || 0, 0, currencyCode)}
            hint={dashboard?.cycle?.cycleNumber ? `Cycle ${dashboard.cycle.cycleNumber}` : undefined}
            icon={<Coins className="w-5 h-5" />}
          />
          <KpiCard
            title="Current pot"
            value={formatCurrency(dashboard.tontine.currentCyclePot?.amount || 0, 0, currencyCode)}
            hint={dashboardPeriod.kind === 'range' ? `${dashboardPeriod.from} → ${dashboardPeriod.to}` : 'Current cycle'}
            icon={<Wallet className="w-5 h-5" />}
          />
          <KpiCard
            title="Next payout"
            value={(() => {
              const nextId = dashboard.tontine.nextPayoutMemberId;
              const name = nextId ? group?.members?.find((m: any) => m.id === nextId)?.user?.fullName : undefined;
              return name || '—';
            })()}
            hint={dashboard.tontine.nextPayoutDate ? new Date(dashboard.tontine.nextPayoutDate).toLocaleDateString() : undefined}
            icon={<Wallet className="w-5 h-5" />}
          />
          <KpiCard
            title="Queue"
            value={`${dashboard.tontine.payoutQueueProgress?.currentPosition || 1}/${dashboard.tontine.payoutQueueProgress?.totalPositions || 0}`}
            hint="Rotation order"
            icon={<BarChart3 className="w-5 h-5" />}
          />
        </div>
      ) : null}

      {groupType === 'MICRO_SAVINGS' && dashboard?.microSavings ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Net balance"
            value={formatCurrency(dashboard.microSavings.netGroupBalance?.amount || 0, 0, currencyCode)}
            icon={<Wallet className="w-5 h-5" />}
          />
          <KpiCard
            title="Total deposits"
            value={formatCurrency(dashboard.microSavings.totalDeposits?.amount || 0, 0, currencyCode)}
            icon={<Coins className="w-5 h-5" />}
          />
          <KpiCard
            title="Total withdrawals"
            value={formatCurrency(dashboard.microSavings.totalWithdrawals?.amount || 0, 0, currencyCode)}
            icon={<ShieldAlert className="w-5 h-5" />}
          />
          <KpiCard
            title="Avg member balance"
            value={formatCurrency(dashboard.microSavings.averageMemberBalance?.amount || 0, 0, currencyCode)}
            icon={<BarChart3 className="w-5 h-5" />}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {groupType === 'TONTINE' && dashboard?.cycle ? (
            <ContributionsStatusPanel key={cycleFilter} cycle={dashboard.cycle} currencyCode={currencyCode} initialFilter={cycleFilter} />
          ) : null}
          {dashboard ? <DashboardInsightsPanel dashboard={dashboard} currencyCode={currencyCode} /> : null}
        </div>
        <div className="lg:col-span-5">
          <RecentActivityPanel items={dashboard?.recentActivity || []} currencyCode={currencyCode} />
        </div>
      </div>

      {dashboard?.memberStatus ? (
        <MemberStatusTable data={dashboard.memberStatus} currencyCode={currencyCode} />
      ) : null}

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-white/10 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${activeTab === 'transactions' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          {t('dashboard.financial_history')}
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${activeTab === 'members' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          {t('dashboard.members_payout')}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${activeTab === 'requests' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          {t('dashboard.withdrawal_requests')}
        </button>
      </div>

      {activeTab === 'transactions' && (
        <div className="glass-card overflow-hidden animate-fade-in">
          <div className="px-4 sm:px-6 md:px-8 py-5 md:py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h2 className="text-xl font-bold text-white">{t('dashboard.recent_transactions')}</h2>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">{t('dashboard.live_updates')}</span>
          </div>

          <div className="md:hidden divide-y divide-white/5">
            {transactions?.map((c: any) => (
              <div key={c.id} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {c.member?.user?.fullName || 'Unknown'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(c.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest">
                      {c.metadata?.paymentMethod || 'BANK'}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-bold tabular-nums ${c.transactionType === 'PAYOUT' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {c.transactionType === 'PAYOUT' ? '-' : '+'}{formatCurrency(c.amount, 0, c.currencyCode)}
                    </div>
                    <div className="mt-2">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${c.transactionType === 'PAYOUT' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                        {c.transactionType === 'PAYOUT' ? t('common.payout') : t('common.completed')}
                      </span>
                    </div>
                    {(c.transactionType === 'PAYOUT' || c.transactionType === 'CONTRIBUTION') && (
                      <button
                        onClick={() => setEditingTransaction(c)}
                        className="mt-3 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200"
                      >
                        {String(t('common.edit', { defaultValue: 'Edit' } as any))}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.date')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.member')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.amount')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.method')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.status')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">
                    {String(t('common.actions', { defaultValue: 'Actions' } as any))}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 md:px-8 py-5 text-sm text-slate-300">
                      {new Date(c.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 md:px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/30">
                          {c.member?.user?.fullName.charAt(0) || '?'}
                        </div>
                        <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                          {c.member?.user?.fullName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-5 text-sm font-semibold text-slate-200">
                      <span className={c.transactionType === 'PAYOUT' ? 'text-rose-400' : 'text-emerald-400'}>
                        {c.transactionType === 'PAYOUT' ? '-' : '+'}{formatCurrency(c.amount, 0, c.currencyCode)}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-5 text-sm text-slate-400 uppercase tracking-tighter">
                      {c.metadata?.paymentMethod || 'BANK'}
                    </td>
                    <td className="px-6 md:px-8 py-5">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${c.transactionType === 'PAYOUT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                        {c.transactionType === 'PAYOUT' ? t('common.payout') : t('common.completed')}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-5 text-right">
                      {(c.transactionType === 'PAYOUT' || c.transactionType === 'CONTRIBUTION') ? (
                        <button
                          onClick={() => setEditingTransaction(c)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200"
                        >
                          {String(t('common.edit', { defaultValue: 'Edit' } as any))}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!transactions || transactions.length === 0) && (
            <div className="p-12 text-center text-slate-500 italic text-sm">
              {t('dashboard.no_transactions')}
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="glass-card overflow-hidden animate-fade-in">
          <div className="px-4 sm:px-6 md:px-8 py-5 md:py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h2 className="text-xl font-bold text-white">{t('dashboard.roster_schedule')}</h2>
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">{group?.members?.length || 0} {t('dashboard.total_members')}</span>
          </div>

          <div className="md:hidden">
            <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={selectedMemberIds.length === (group?.members?.length || 0) && (group?.members?.length || 0) > 0}
                  onChange={() => toggleSelectAll(group?.members || [])}
                />
                <span className="font-semibold">{t('common.select_all') || 'Select all'}</span>
              </label>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                {selectedMemberIds.length > 0 ? `${selectedMemberIds.length} selected` : ''}
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {[...(group?.members || [])]
                .sort((a: any, b: any) => (a.payoutPosition || 999) - (b.payoutPosition || 999))
                .map((m: any, index: number) => (
                  <div key={m.id} className={`p-4 sm:p-5 ${selectedMemberIds.includes(m.id) ? 'bg-indigo-500/5' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={selectedMemberIds.includes(m.id)}
                          onChange={() => toggleSelectMember(m.id)}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-black text-xs border border-indigo-500/30 flex-shrink-0">
                              {m.payoutPosition || index + 1}
                            </span>
                            <div className="text-sm font-semibold text-white truncate">
                              {m.user?.fullName}
                            </div>
                            {m.isCurrentInAll ? (
                              <span
                                className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse flex-shrink-0"
                                title={String(t('admin_dashboard.active_all_categories', { defaultValue: 'Active in all categories' } as any))}
                              />
                            ) : null}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.isSavingsGroupMember ? (
                              <span className="text-[8px] font-bold uppercase text-emerald-500/80 px-1 bg-emerald-500/5 rounded">{String(t('common.group', { defaultValue: 'Group' } as any))}</span>
                            ) : null}
                            {m.isMicroSavingsMember ? (
                              <span className="text-[8px] font-bold uppercase text-blue-500/80 px-1 bg-blue-500/5 rounded">{String(t('common.micro', { defaultValue: 'Micro' } as any))}</span>
                            ) : null}
                            {m.isMicroInvestmentMember ? (
                              <span className="text-[8px] font-bold uppercase text-amber-500/80 px-1 bg-amber-500/5 rounded">{String(t('common.invest', { defaultValue: 'Invest' } as any))}</span>
                            ) : null}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('common.acc_number')}</div>
                              <div className="mt-1 text-xs font-mono text-slate-300 truncate">{m.accountNumber || t('common.pending')}</div>
                            </div>
                            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('dashboard.personal_balance') || 'Personal Balance'}</div>
                              <div className="mt-1 text-xs font-semibold text-rose-300 tabular-nums">
                                {formatCurrency(m.user?.savingsGoals?.reduce((acc: number, g: any) => acc + Number(g.currentAmount), 0) || 0, 0, currencyCode)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${m.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              m.status === 'SUSPENDED' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              m.status === 'INACTIVE' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                'bg-slate-500/20 text-slate-400 border-slate-500/30'
                              }`}>
                              {m.status === 'ACTIVE' ? t('common.active') : m.status === 'SUSPENDED' ? t('common.suspended') : m.status === 'INACTIVE' ? t('common.inactive') || 'Inactive' : t('common.pending')}
                            </span>

                            {(m.userId === group?.adminUserId || m.user?.role === 'ADMIN') ? (
                              <span className={`text-[10px] inline-block px-2 py-0.5 rounded-full border ${m.user?.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                {m.user?.role === 'ADMIN' ? t('role.SYS_ADMIN') : t('role.GROUP_ADMIN')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {m.userId !== group?.adminUserId && m.user?.role !== 'ADMIN' ? (
                          <div className="relative">
                            <button
                              onClick={() => setMemberMenuOpenId(memberMenuOpenId === m.id ? null : m.id)}
                              className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xl leading-none"
                              aria-label={t('common.actions') || 'Actions'}
                            >
                              ⋮
                            </button>
                            {memberMenuOpenId === m.id && (
                              <div className="absolute right-0 top-10 z-30 w-48 bg-slate-900/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                {m.status === 'PENDING' ? (
                                  <>
                                    <button
                                      onClick={() => handleMemberAction('approve', m)}
                                      className="w-full px-4 py-3 text-sm text-left text-emerald-400 hover:bg-emerald-500/10 transition-colors border-b border-white/5 flex items-center gap-2"
                                    >
                                      <span>✅</span> {t('common.activate') || 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => handleMemberAction('reject', m)}
                                      className="w-full px-4 py-3 text-sm text-left text-rose-400 hover:bg-rose-500/10 transition-colors border-b border-white/5 flex items-center gap-2"
                                    >
                                      <span>✖️</span> {t('common.reject') || 'Reject'}
                                    </button>
                                  </>
                                ) : m.status === 'SUSPENDED' || m.status === 'INACTIVE' ? (
                                  <button
                                    onClick={() => handleMemberAction('activate', m)}
                                    className="w-full px-4 py-3 text-sm text-left text-emerald-400 hover:bg-emerald-500/10 transition-colors border-b border-white/5 flex items-center gap-2"
                                  >
                                    <span>✅</span> {t('common.activate') || 'Activate'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleMemberAction('suspend', m)}
                                    className="w-full px-4 py-3 text-sm text-left text-amber-400 hover:bg-amber-500/10 transition-colors border-b border-white/5 flex items-center gap-2"
                                  >
                                    <span>⏸</span> {t('common.suspend') || 'Suspend'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleMemberAction('edit', m)}
                                  className="w-full px-4 py-3 text-sm text-left text-indigo-300 hover:bg-white/10 transition-colors border-b border-white/5 flex items-center gap-2"
                                >
                                  <span>✏️</span> {t('common.edit')}
                                </button>
                                <button
                                  onClick={() => handleMemberAction('remove', m)}
                                  className="w-full px-4 py-3 text-sm text-left text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                                >
                                  <span>🗑</span> {t('common.delete')}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-6 md:px-8 py-4 w-10">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedMemberIds.length === (group?.members?.length || 0) && (group?.members?.length || 0) > 0}
                      onChange={() => toggleSelectAll(group?.members || [])}
                    />
                  </th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.payout_order')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.member_name')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.join_date')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.acc_number')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.personal_balance') || 'Personal Balance'}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.status')}</th>
                  <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...(group?.members || [])].sort((a: any, b: any) => (a.payoutPosition || 999) - (b.payoutPosition || 999)).map((m: any, index: number) => (
                  <tr key={m.id} className={`hover:bg-white/[0.02] transition-colors group ${selectedMemberIds.includes(m.id) ? 'bg-indigo-500/5' : ''}`}>
                    <td className="px-6 md:px-8 py-5">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={selectedMemberIds.includes(m.id)}
                        onChange={() => toggleSelectMember(m.id)}
                      />
                    </td>
                    <td className="px-6 md:px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/30">
                          {m.payoutPosition || index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-5 font-medium text-slate-200">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {m.user?.fullName}
                          {m.isCurrentInAll && (
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" title={String(t('admin_dashboard.active_all_categories', { defaultValue: 'Active in all categories' } as any))}></span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {m.isSavingsGroupMember && <span className="text-[8px] font-bold uppercase text-emerald-500/80 px-1 bg-emerald-500/5 rounded">{String(t('common.group', { defaultValue: 'Group' } as any))}</span>}
                          {m.isMicroSavingsMember && <span className="text-[8px] font-bold uppercase text-blue-500/80 px-1 bg-blue-500/5 rounded">{String(t('common.micro', { defaultValue: 'Micro' } as any))}</span>}
                          {m.isMicroInvestmentMember && <span className="text-[8px] font-bold uppercase text-amber-500/80 px-1 bg-amber-500/5 rounded">{String(t('common.invest', { defaultValue: 'Invest' } as any))}</span>}
                        </div>
                      </div>
                      {(m.userId === group?.adminUserId || m.user?.role === 'ADMIN') && (
                        <span className={`mt-1 text-[10px] inline-block px-2 py-0.5 rounded-full border ${m.user?.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {m.user?.role === 'ADMIN' ? t('role.SYS_ADMIN') : t('role.GROUP_ADMIN')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 md:px-8 py-5 text-sm text-slate-400">
                      {new Date(m.joinDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 md:px-8 py-5 text-sm text-slate-400 font-mono">
                      {m.accountNumber || t('common.pending')}
                    </td>
                    <td className="px-6 md:px-8 py-5 text-sm font-semibold text-rose-400">
                      {formatCurrency(m.user?.savingsGoals?.reduce((acc: number, g: any) => acc + Number(g.currentAmount), 0) || 0, 0, currencyCode)}
                    </td>
                    <td className="px-6 md:px-8 py-5">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${m.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        m.status === 'SUSPENDED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        m.status === 'INACTIVE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                        {m.status === 'ACTIVE' ? t('common.active') : m.status === 'SUSPENDED' ? t('common.suspended') : m.status === 'INACTIVE' ? t('common.inactive') || 'Inactive' : t('common.pending')}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-5">
                      {m.userId !== group?.adminUserId && m.user?.role !== 'ADMIN' ? (
                        <div className="relative">
                          <button
                            onClick={() => setMemberMenuOpenId(memberMenuOpenId === m.id ? null : m.id)}
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xl leading-none"
                          >⋮</button>
                          {memberMenuOpenId === m.id && (
                            <div className="absolute right-0 top-10 z-30 w-48 bg-slate-900/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                              {m.status === 'PENDING' ? (
                                <>
                                  <button
                                    onClick={() => handleMemberAction('approve', m)}
                                    className="w-full px-4 py-3 text-sm text-left text-emerald-400 hover:bg-emerald-500/10 transition-colors border-b border-white/5 flex items-center gap-2"
                                  >
                                    <span>✅</span> {t('common.activate') || 'Approve'}
                                  </button>
                                  <button
                                    onClick={() => handleMemberAction('reject', m)}
                                    className="w-full px-4 py-3 text-sm text-left text-rose-400 hover:bg-rose-500/10 transition-colors border-b border-white/5 flex items-center gap-2"
                                  >
                                    <span>✖️</span> {t('common.reject') || 'Reject'}
                                  </button>
                                </>
                              ) : m.status === 'SUSPENDED' || m.status === 'INACTIVE' ? (
                                <button
                                  onClick={() => handleMemberAction('activate', m)}
                                  className="w-full px-4 py-3 text-sm text-left text-emerald-400 hover:bg-emerald-500/10 transition-colors border-b border-white/5 flex items-center gap-2"
                                >
                                  <span>✅</span> {t('common.activate') || 'Activate'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleMemberAction('suspend', m)}
                                  className="w-full px-4 py-3 text-sm text-left text-amber-400 hover:bg-amber-500/10 transition-colors border-b border-white/5 flex items-center gap-2"
                                >
                                  <span>⏸</span> {t('common.suspend') || 'Suspend'}
                                </button>
                              )}
                              <button
                                onClick={() => handleMemberAction('edit', m)}
                                className="w-full px-4 py-3 text-sm text-left text-indigo-300 hover:bg-white/10 transition-colors border-b border-white/5 flex items-center gap-2"
                              >
                                <span>✏️</span> {t('common.edit')}
                              </button>
                              <button
                                onClick={() => handleMemberAction('remove', m)}
                                className="w-full px-4 py-3 text-sm text-left text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                              >
                                <span>🗑</span> {t('common.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!group?.members || group.members.length === 0) && (
            <div className="p-12 text-center text-slate-500 italic text-sm">
              {t('dashboard.no_members')}
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <WithdrawalRequestsTab groupId={groupId!} />
      )}

      {/* Modals */}
      <RecordContributionModal
        groupId={groupId!}
        members={group?.members || []}
        currencyCode={currencyCode}
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
      />
      <RecordPayoutModal
        groupId={groupId!}
        members={group?.members || []}
        currencyCode={currencyCode}
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
      />
      <InviteMembersModal
        groupId={groupId!}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
      <EditGroupModal
        group={group}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
      <DeleteGroupDialog
        group={group}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
      <EditMemberModal
        groupId={groupId!}
        member={selectedMember}
        isOpen={isEditMemberModalOpen}
        onClose={() => {
          setIsEditMemberModalOpen(false);
          setSelectedMember(null);
        }}
      />
      <SendNotificationModal
        groupId={groupId!}
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      {editingTransaction ? (
        <EditRecordModal
          groupId={groupId!}
          transaction={editingTransaction}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      ) : null}

      {/* Bulk Action Bar */}
      {selectedMemberIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-slide-up">
          <div className="glass-card bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 shadow-2xl p-4 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                {selectedMemberIds.length}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">{t('admin.members_selected')}</h4>
                <p className="text-[10px] text-slate-400 uppercase font-medium">{t('admin.apply_bulk_actions')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                disabled={isBulkProcessing}
                onClick={() => handleBulkUpdate({ isCurrentInAll: true })}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                {t('common.set_current')}
              </button>
              <button 
                disabled={isBulkProcessing}
                onClick={() => handleBulkUpdate({ isSavingsGroupMember: true, isMicroSavingsMember: true })}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                {t('common.standard_micro')}
              </button>
              <button 
                onClick={() => setSelectedMemberIds([])}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        groupId={groupId!}
      />
    </div>
  );
}
