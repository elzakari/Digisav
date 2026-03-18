import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { groupService } from '@/services/group.service';
import { contributionService } from '@/services/contribution.service';
import { RecordContributionModal } from '@/components/admin/RecordContributionModal';
import { RecordPayoutModal } from '@/components/admin/RecordPayoutModal';
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

export function GroupDashboard() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const isSystemAdmin = user?.role === 'ADMIN';

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['group-stats', groupId],
    queryFn: () => contributionService.getGroupStats(groupId!),
    enabled: !!groupId,
  });

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupById(groupId!),
    enabled: !!groupId,
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
  });

  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'members' | 'requests'>('transactions');
  const [memberMenuOpenId, setMemberMenuOpenId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

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

  const handleMemberAction = async (action: 'edit' | 'remove', member: any) => {
    if (action === 'edit') {
      setSelectedMember(member);
      setIsEditMemberModalOpen(true);
      setMemberMenuOpenId(null);
      return;
    }

    if (window.confirm(t('common.are_you_sure_remove_member'))) {
      try {
        await groupService.removeMember(member.id);
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        setMemberMenuOpenId(null);
      } catch (err: any) {
        console.error('Member action failed', err?.response?.data?.message || err);
      }
    }
  };

  const handleDownloadReport = () => {
    setIsReportsModalOpen(true);
  };

  if (statsLoading || historyLoading || groupLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-indigo-400 font-medium text-lg">{t('common.loading')}</div>
    </div>
  );

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
          <h1 className="text-4xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="glass-button btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {t('dashboard.invite_members')}
          </button>
          <button
            onClick={() => setIsContributionModalOpen(true)}
            className="glass-button btn-success flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('dashboard.record_payment')}
          </button>
          <button
            onClick={() => setIsPayoutModalOpen(true)}
            className="glass-button btn-warning flex items-center gap-2 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {t('dashboard.record_payout') || 'Record Payout'}
          </button>
          <button
            onClick={handleDownloadReport}
            className="glass-button btn-secondary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('dashboard.export_report')}
          </button>
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            className="glass-button flex items-center gap-2 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {t('common.send_notification') || 'Send Notification'}
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="glass-button btn-info flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {t('dashboard.edit_settings')}
          </button>
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            className="glass-button btn-danger flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {(group?.status === 'DRAFT' || isSystemAdmin) ? t('dashboard.delete_group') : t('dashboard.close_group')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('dashboard.total_expected')}
          value={formatCurrency(stats?.totalExpected || 0, 0, stats?.currencyCode)}
          type="info"
        />
        <StatCard
          title={t('dashboard.total_collected')}
          value={formatCurrency(stats?.totalCollected || 0, 0, stats?.currencyCode)}
          type="success"
        />
        <StatCard
          title={t('dashboard.outstanding')}
          value={formatCurrency(stats?.outstanding || 0, 0, stats?.currencyCode)}
          type="warning"
        />
        <StatCard
          title={t('dashboard.compliance_rate')}
          value={stats?.complianceRate ? `${stats.complianceRate.toFixed(1)}%` : '0%'}
          type={stats?.complianceRate >= 90 ? 'success' : 'danger'}
        />
      </div>

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
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h2 className="text-xl font-bold text-white">{t('dashboard.recent_transactions')}</h2>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">{t('dashboard.live_updates')}</span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.date')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.member')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.amount')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.method')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-5 text-sm text-slate-300">
                      {new Date(c.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/30">
                          {c.member?.user?.fullName.charAt(0) || '?'}
                        </div>
                        <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                          {c.member?.user?.fullName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-semibold text-slate-200">
                      <span className={c.transactionType === 'PAYOUT' ? 'text-rose-400' : 'text-emerald-400'}>
                        {c.transactionType === 'PAYOUT' ? '-' : '+'}{formatCurrency(c.amount, 0, c.currencyCode)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-400 uppercase tracking-tighter">
                      {c.metadata?.paymentMethod || 'BANK'}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${c.transactionType === 'PAYOUT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                        {c.transactionType === 'PAYOUT' ? t('common.payout') : t('common.completed')}
                      </span>
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
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h2 className="text-xl font-bold text-white">{t('dashboard.roster_schedule')}</h2>
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">{group?.members?.length || 0} {t('dashboard.total_members')}</span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-8 py-4 w-10">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedMemberIds.length === (group?.members?.length || 0) && (group?.members?.length || 0) > 0}
                      onChange={() => toggleSelectAll(group?.members || [])}
                    />
                  </th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.payout_order')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.member_name')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.join_date')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.acc_number')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.personal_balance') || 'Personal Balance'}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.status')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...(group?.members || [])].sort((a: any, b: any) => (a.payoutPosition || 999) - (b.payoutPosition || 999)).map((m: any, index: number) => (
                  <tr key={m.id} className={`hover:bg-white/[0.02] transition-colors group ${selectedMemberIds.includes(m.id) ? 'bg-indigo-500/5' : ''}`}>
                    <td className="px-8 py-5">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={selectedMemberIds.includes(m.id)}
                        onChange={() => toggleSelectMember(m.id)}
                      />
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/30">
                          {m.payoutPosition || index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-200">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {m.user?.fullName}
                          {m.isCurrentInAll && (
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" title="Active in all categories"></span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {m.isSavingsGroupMember && <span className="text-[8px] font-bold uppercase text-emerald-500/80 px-1 bg-emerald-500/5 rounded">Group</span>}
                          {m.isMicroSavingsMember && <span className="text-[8px] font-bold uppercase text-blue-500/80 px-1 bg-blue-500/5 rounded">Micro</span>}
                          {m.isMicroInvestmentMember && <span className="text-[8px] font-bold uppercase text-amber-500/80 px-1 bg-amber-500/5 rounded">Invest</span>}
                        </div>
                      </div>
                      {(m.userId === group?.adminUserId || m.user?.role === 'ADMIN') && (
                        <span className={`mt-1 text-[10px] inline-block px-2 py-0.5 rounded-full border ${m.user?.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {m.user?.role === 'ADMIN' ? t('role.SYS_ADMIN') : t('role.GROUP_ADMIN')}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-400">
                      {new Date(m.joinDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-400 font-mono">
                      {m.accountNumber || t('common.pending')}
                    </td>
                    <td className="px-8 py-5 text-sm font-semibold text-rose-400">
                      {formatCurrency(m.user?.savingsGoals?.reduce((acc: number, g: any) => acc + Number(g.currentAmount), 0) || 0, 0, stats?.currencyCode)}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${m.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        m.status === 'SUSPENDED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                        {m.status === 'ACTIVE' ? t('common.active') : m.status === 'SUSPENDED' ? t('common.suspended') : t('common.pending')}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {m.userId !== group?.adminUserId && m.user?.role !== 'ADMIN' ? (
                        <div className="relative">
                          <button
                            onClick={() => setMemberMenuOpenId(memberMenuOpenId === m.id ? null : m.id)}
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xl leading-none"
                          >⋮</button>
                          {memberMenuOpenId === m.id && (
                            <div className="absolute right-0 top-10 z-30 w-44 bg-slate-900/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                              <button
                                onClick={() => handleMemberAction('edit', m)}
                                className="w-full px-4 py-3 text-sm text-left text-amber-400 hover:bg-amber-500/10 transition-colors border-b border-white/5 flex items-center gap-2"
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
        currencyCode={stats?.currencyCode || 'KES'}
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
      />
      <RecordPayoutModal
        groupId={groupId!}
        members={group?.members || []}
        currencyCode={stats?.currencyCode || 'KES'}
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
