import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { contributionService } from '@/services/contribution.service';
import { transactionService } from '@/services/transaction.service';
import { publishAppEvent } from '@/lib/appEvents';

type Props = {
  groupId: string;
  transaction: any;
  isOpen: boolean;
  onClose: () => void;
};

const paymentOptions = [
  { ui: 'BANK', api: 'BANK_TRANSFER', label: 'Bank transfer' },
  { ui: 'MOBILE_MONEY', api: 'MOBILE_MONEY', label: 'Mobile money' },
  { ui: 'CASH', api: 'CASH', label: 'Cash' },
] as const;

function toIsoDateInput(value: any) {
  const d = value ? new Date(value) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function mapUiToContributionApi(method: string | undefined) {
  if (!method) return undefined;
  const m = String(method).toUpperCase();
  if (m === 'MPESA') return 'MOBILE_MONEY';
  if (m === 'BANK') return 'BANK_TRANSFER';
  if (m === 'CASH') return 'CASH';
  if (m === 'MOBILE_MONEY' || m === 'BANK_TRANSFER') return m;
  return undefined;
}

export function EditRecordModal({ groupId, transaction, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const initial = useMemo(() => {
    const meta = transaction?.metadata || {};
    const paymentMethod = meta.paymentMethod || 'BANK';
    const referenceNumber = meta.referenceNumber || '';
    const notes = meta.notes || '';
    const paymentDate = toIsoDateInput(meta.paymentDate || transaction?.timestamp);
    const amount = transaction?.amount != null ? String(transaction.amount) : '';
    return { paymentMethod, referenceNumber, notes, paymentDate, amount };
  }, [transaction]);

  const [form, setForm] = useState(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      const amount = form.amount ? Number(form.amount) : undefined;
      const paymentDateIso = form.paymentDate ? new Date(form.paymentDate).toISOString() : undefined;

      if (transaction?.transactionType === 'CONTRIBUTION') {
        const contributionId = transaction?.referenceId;
        if (!contributionId) {
          throw new Error('Missing contribution reference');
        }
        const paymentMethod = mapUiToContributionApi(form.paymentMethod);
        
        // Remove undefined/null/empty keys to avoid validation errors
        const updatePayload: any = {};
        if (amount !== undefined) updatePayload.amount = amount;
        if (paymentDateIso) updatePayload.paymentDate = paymentDateIso;
        if (paymentMethod) updatePayload.paymentMethod = paymentMethod;
        if (form.referenceNumber !== undefined) updatePayload.referenceNumber = form.referenceNumber || null;
        if (form.notes !== undefined) updatePayload.notes = form.notes || null;

        return contributionService.updateContribution(groupId, contributionId, updatePayload);
      }

      if (transaction?.transactionType === 'PAYOUT') {
        const updatePayload: any = {};
        if (amount !== undefined) updatePayload.amount = amount;
        if (paymentDateIso) updatePayload.paymentDate = paymentDateIso;
        if (form.paymentMethod) updatePayload.paymentMethod = form.paymentMethod;
        if (form.referenceNumber !== undefined) updatePayload.referenceNumber = form.referenceNumber || null;
        if (form.notes !== undefined) updatePayload.notes = form.notes || null;

        return transactionService.adjustPayout(groupId, transaction.id, updatePayload);
      }

      throw new Error('Unsupported transaction type');
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['group-transactions', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-dashboard', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-stats', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-contributions', groupId] });
      publishAppEvent({ type: 'group_recordings_changed', groupId });
      toast.success(String(t('common.saved', { defaultValue: 'Saved' } as any)));
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message;
      toast.error(String(msg || t('common.error', { defaultValue: 'Error' } as any)));
    },
  });

  if (!isOpen) return null;

  const title =
    transaction?.transactionType === 'PAYOUT'
      ? String(t('admin.edit_payout', { defaultValue: 'Edit payout record' } as any))
      : String(t('admin.edit_contribution', { defaultValue: 'Edit contribution record' } as any));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-xl p-6 relative border border-white/10 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-95 z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {String(t('admin.edit_record_desc', { defaultValue: 'Fix mistakes by saving a correction. A correction entry will be recorded for audit.' } as any))}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{String(t('common.amount', { defaultValue: 'Amount' } as any))}</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{String(t('common.date', { defaultValue: 'Date' } as any))}</label>
              <input
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                value={form.paymentDate}
                onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{String(t('common.method', { defaultValue: 'Method' } as any))}</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none transition-all"
                value={form.paymentMethod}
                onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
              >
                {paymentOptions.map((o) => (
                  <option key={o.ui} value={o.ui} className="bg-slate-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{String(t('admin.ref_number', { defaultValue: 'Reference' } as any))}</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                value={form.referenceNumber}
                onChange={(e) => setForm((p) => ({ ...p, referenceNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{String(t('admin.notes', { defaultValue: 'Notes' } as any))}</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all resize-none h-20"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-slate-200 hover:bg-white/[0.05] text-xs font-black uppercase tracking-widest"
              disabled={mutation.isPending}
            >
              {String(t('common.cancel', { defaultValue: 'Cancel' } as any))}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mutation.isPending
                ? String(t('common.processing', { defaultValue: 'Processing...' } as any))
                : String(t('common.save', { defaultValue: 'Save' } as any))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

