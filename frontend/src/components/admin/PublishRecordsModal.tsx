import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/utils/currencyFormatter';
import { contributionService } from '@/services/contribution.service';

type Props = {
  groupId: string;
  currencyCode: string;
  isOpen: boolean;
  onClose: () => void;
};

export function PublishRecordsModal({ groupId, currencyCode, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['pending-publishes', groupId],
    queryFn: () => contributionService.getPendingPublishes(groupId),
    enabled: isOpen && !!groupId,
    refetchOnWindowFocus: false,
  });

  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const publishMutation = useMutation({
    mutationFn: (args: { publishAll?: boolean; transactionIds?: string[] }) =>
      contributionService.publishMicroSavings(groupId, args),
    onSuccess: async (res: any) => {
      const count = res?.publishedCount ?? 0;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-publishes', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['group-dashboard', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['my-groups'] }),
        queryClient.invalidateQueries({ queryKey: ['member-stats'] }),
      ]);
      setSelectedIds([]);
      toast.success(String(t('admin.published_n', { count, defaultValue: 'Published {{count}} record(s)' } as any)));
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message;
      toast.error(String(msg || t('common.error', { defaultValue: 'Error' } as any)));
    },
  });

  const recalcMutation = useMutation({
    mutationFn: () => contributionService.recalculateMicroSavingsBalances(groupId),
    onSuccess: async (res: any) => {
      const n = res?.updatedGoals ?? 0;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-dashboard', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['my-groups'] }),
        queryClient.invalidateQueries({ queryKey: ['member-stats'] }),
      ]);
      toast.success(String(t('admin.recalculated_n', { count: n, defaultValue: 'Recalculated {{count}} member balance(s)' } as any)));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message;
      toast.error(String(msg || t('common.error', { defaultValue: 'Error' } as any)));
    },
  });

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map((i: any) => i.id));
  };

  const canPublishSelected = selectedIds.length > 0 && !publishMutation.isPending;
  const canPublishAll = items.length > 0 && !publishMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-3xl p-6 relative border border-white/10 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-95 z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-black text-white tracking-tight">
            {String(t('admin.publish_records', { defaultValue: 'Publish records' } as any))}
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {String(t('admin.publish_records_desc', { defaultValue: 'Saved records are not shown to members until published.' } as any))}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              checked={items.length > 0 && selectedIds.length === items.length}
              onChange={selectAll}
              disabled={items.length === 0}
            />
            {String(t('common.select_all', { defaultValue: 'Select all' } as any))}
          </label>

          <div className="flex items-center gap-2">
            <button
              disabled={recalcMutation.isPending}
              onClick={() => recalcMutation.mutate()}
              className="glass-button btn-secondary px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-40"
            >
              {String(t('admin.recalculate', { defaultValue: 'Recalculate' } as any))}
            </button>
            <button
              disabled={!canPublishSelected}
              onClick={() => publishMutation.mutate({ transactionIds: selectedIds })}
              className="glass-button btn-warning px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-40"
            >
              {String(t('admin.publish_selected', { defaultValue: 'Publish selected' } as any))}
            </button>
            <button
              disabled={!canPublishAll}
              onClick={() => publishMutation.mutate({ publishAll: true })}
              className="glass-button btn-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-40"
            >
              {String(t('admin.publish_all', { defaultValue: 'Publish all' } as any))}
            </button>
          </div>
        </div>

        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[40px_1.2fr_0.9fr_0.9fr] gap-3 px-4 py-3 bg-white/[0.03] text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div />
            <div>{String(t('common.member', { defaultValue: 'Member' } as any))}</div>
            <div>{String(t('common.date', { defaultValue: 'Date' } as any))}</div>
            <div className="text-right">{String(t('common.amount', { defaultValue: 'Amount' } as any))}</div>
          </div>

          <div className="max-h-[55vh] overflow-auto divide-y divide-white/5">
            {isLoading ? (
              <div className="p-10 text-center text-slate-500 text-sm">{String(t('common.loading', { defaultValue: 'Loading...' } as any))}</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-sm">{String(t('admin.no_pending_publishes', { defaultValue: 'No pending records.' } as any))}</div>
            ) : (
              items.map((it: any) => {
                const checked = selectedIds.includes(it.id);
                const ts = it.timestamp ? new Date(it.timestamp) : null;
                const name = it.member?.user?.fullName || String(t('common.unknown', { defaultValue: 'Unknown' } as any));
                const amount = Number(it.amount || 0);
                return (
                  <div key={it.id} className="grid grid-cols-[40px_1.2fr_0.9fr_0.9fr] gap-3 px-4 py-4 items-center hover:bg-white/[0.02]">
                    <div>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={checked}
                        onChange={() => toggle(it.id)}
                      />
                    </div>
                    <div className="text-sm text-white font-semibold truncate">{name}</div>
                    <div className="text-xs text-slate-400">{ts ? ts.toLocaleString() : '—'}</div>
                    <div className="text-right text-sm font-black tabular-nums text-amber-300">+{formatCurrency(Math.abs(amount), 0, currencyCode)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

