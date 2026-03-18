import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savingsService } from '@/services/savings.service';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currencyFormatter';
import { useState } from 'react';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { toast } from 'react-hot-toast';

interface WithdrawalRequestsTabProps {
  groupId: string;
}

export function WithdrawalRequestsTab({ groupId }: WithdrawalRequestsTabProps) {
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
    variant: 'success'
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['withdrawal-requests', groupId],
    queryFn: () => savingsService.getGroupWithdrawalRequests(groupId),
    enabled: !!groupId,
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => savingsService.approveWithdrawalRequest(groupId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-transactions', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-stats', groupId] });
      toast.success(t('admin.withdrawal_approved') || 'Withdrawal request approved successfully.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('admin.failed_approve') || 'Failed to approve request.');
    }
  });

  const denyMutation = useMutation({
    mutationFn: (requestId: string) => savingsService.denyWithdrawalRequest(groupId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests', groupId] });
      toast.success(t('admin.withdrawal_denied') || 'Withdrawal request denied successfully.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('admin.failed_deny') || 'Failed to deny request.');
    }
  });

  if (isLoading) {
    return (
      <div className="glass-card p-12 text-center text-slate-400 animate-pulse">
        {t('admin.loading_requests') || 'Loading requests...'}
      </div>
    );
  }

  const pendingRequests = requests?.filter((r: any) => r.status === 'PENDING') || [];
  const processedRequests = requests?.filter((r: any) => r.status !== 'PENDING') || [];

  return (
    <div className="space-y-6">
      <div className="glass-card overflow-hidden animate-fade-in">
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white">{t('admin.pending_requests') || 'Pending Requests'}</h2>
          <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">
            {t('admin.pending_count', { count: pendingRequests.length }) || `${pendingRequests.length} Pending`}
          </span>
        </div>
        
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.date')}</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.member')}</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.goal')}</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.amount')}</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pendingRequests.map((req: any) => (
                <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-5 text-sm text-slate-300">
                    {new Date(req.requestedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-medium text-white">{req.member?.user?.fullName || 'Unknown'}</span>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-300">
                    {req.savingsGoal?.name || t('common.micro_savings') || 'Micro-savings'}
                  </td>
                  <td className="px-8 py-5 text-sm font-semibold text-amber-400">
                    {formatCurrency(req.amount, 0, req.currencyCode || 'KES')}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                         onClick={() => setConfirmModal({
                           isOpen: true,
                           title: t('admin.approve_request_title') || 'Approve Withdrawal',
                           description: t('admin.approve_request_desc', { name: req.member?.user?.fullName, amount: formatCurrency(req.amount, 0, req.currencyCode || 'KES') }) || `Are you sure you want to approve the withdrawal request of ${formatCurrency(req.amount, 0, req.currencyCode || 'KES')} for ${req.member?.user?.fullName}?`,
                           variant: 'success',
                           onConfirm: () => {
                             approveMutation.mutate(req.id);
                             setConfirmModal(prev => ({ ...prev, isOpen: false }));
                           }
                         })}
                         disabled={approveMutation.isPending || denyMutation.isPending}
                         className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                       >
                         {t('common.approve')}
                       </button>
                       <button 
                         onClick={() => setConfirmModal({
                           isOpen: true,
                           title: t('admin.deny_request_title') || 'Deny Withdrawal',
                           description: t('admin.deny_request_desc', { name: req.member?.user?.fullName }) || `Are you sure you want to deny this withdrawal request?`,
                           variant: 'danger',
                           onConfirm: () => {
                             denyMutation.mutate(req.id);
                             setConfirmModal(prev => ({ ...prev, isOpen: false }));
                           }
                         })}
                         disabled={approveMutation.isPending || denyMutation.isPending}
                         className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                       >
                         {t('common.deny')}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pendingRequests.length === 0 && (
          <div className="p-12 text-center text-slate-500 italic text-sm">
            {t('admin.no_pending_requests') || 'No pending withdrawal requests.'}
          </div>
        )}
      </div>

       {processedRequests.length > 0 && (
        <div className="glass-card overflow-hidden animate-fade-in opacity-70 hover:opacity-100 transition-opacity">
          <div className="px-8 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">{t('common.history')}</h2>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-white/5">
                {processedRequests.slice(0, 10).map((req: any) => (
                  <tr key={req.id} className="hover:bg-white/[0.02]">
                    <td className="px-8 py-3 text-xs text-slate-400">
                      {new Date(req.processedAt || req.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-3 text-sm text-slate-300">
                      {req.member?.user?.fullName} - {formatCurrency(req.amount, 0, req.currencyCode || 'KES')}
                    </td>
                    <td className="px-8 py-3 text-right">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        isLoading={approveMutation.isPending || denyMutation.isPending}
      />
    </div>
  );
}
