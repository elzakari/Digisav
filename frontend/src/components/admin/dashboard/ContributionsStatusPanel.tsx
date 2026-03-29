import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';
import { useTranslation } from 'react-i18next';

type CycleItemStatus = 'DUE' | 'PAID' | 'OVERDUE' | 'DEFAULTED' | 'PENDING';

export type CycleItem = {
  memberId: string;
  memberName: string;
  status: CycleItemStatus;
  dueDate: string | Date;
  paymentDate: string | Date | null;
  amount: number;
  currencyCode: string;
};

type CycleData = {
  cycleNumber: number;
  dueDate: string | Date;
  counts: Record<string, number>;
  totals: {
    dueExpected: number;
    paid: number;
    pastDue: number;
    currencyCode: string;
  };
  items: CycleItem[];
};

type ContributionsStatusPanelProps = {
  cycle: CycleData;
  currencyCode: string;
  initialFilter?: 'due' | 'paid' | 'past_due';
};

function pillClasses(status: CycleItemStatus) {
  if (status === 'PAID') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (status === 'OVERDUE') return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
  if (status === 'DEFAULTED') return 'bg-rose-500/15 text-rose-300 border-rose-500/25';
  return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25';
}

function statusIcon(status: CycleItemStatus) {
  if (status === 'PAID') return <CheckCircle2 className="w-4 h-4" />;
  if (status === 'OVERDUE') return <AlertTriangle className="w-4 h-4" />;
  if (status === 'DEFAULTED') return <XCircle className="w-4 h-4" />;
  return <Clock className="w-4 h-4" />;
}

export function ContributionsStatusPanel({ cycle, currencyCode, initialFilter }: ContributionsStatusPanelProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'due' | 'paid' | 'past_due'>(initialFilter || 'due');

  const filtered = useMemo(() => {
    if (filter === 'paid') return cycle.items.filter((i) => i.status === 'PAID');
    if (filter === 'past_due') return cycle.items.filter((i) => i.status === 'OVERDUE' || i.status === 'DEFAULTED');
    return cycle.items.filter((i) => i.status === 'DUE' || i.status === 'PENDING');
  }, [cycle.items, filter]);

  const cycleDue = useMemo(() => {
    const d = typeof cycle.dueDate === 'string' ? new Date(cycle.dueDate) : cycle.dueDate;
    return format(d, 'MMM d, yyyy');
  }, [cycle.dueDate]);

  const statusLabel = (status: CycleItemStatus) => {
    if (status === 'PAID') return String(t('common.paid', { defaultValue: 'Paid' } as any));
    if (status === 'OVERDUE') return String(t('common.overdue', { defaultValue: 'Overdue' } as any));
    if (status === 'DEFAULTED') return String(t('common.defaulted', { defaultValue: 'Defaulted' } as any));
    if (status === 'PENDING') return String(t('common.pending', { defaultValue: 'Pending' } as any));
    return String(t('common.due', { defaultValue: 'Due' } as any));
  };

  return (
    <section className="glass-card overflow-hidden">
      <div className="px-4 sm:px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/[0.02]">
        <div className="min-w-0">
          <div className="text-sm font-black text-white tracking-tight">{String(t('admin_dashboard.contributions_status_title', { defaultValue: 'Contributions Status' } as any))}</div>
          <div className="text-xs text-slate-500 mt-1">
            {String(t('admin_dashboard.cycle_due', { cycle: cycle.cycleNumber, date: cycleDue, defaultValue: 'Cycle {{cycle}} · Due {{date}}' } as any))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter('due')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${filter === 'due' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
          >
            {String(t('common.due', { defaultValue: 'Due' } as any))}
          </button>
          <button
            type="button"
            onClick={() => setFilter('paid')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${filter === 'paid' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
          >
            {String(t('common.paid', { defaultValue: 'Paid' } as any))}
          </button>
          <button
            type="button"
            onClick={() => setFilter('past_due')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${filter === 'past_due' ? 'bg-amber-500/15 text-amber-300 border-amber-500/25' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
          >
            {String(t('common.past_due', { defaultValue: 'Past due' } as any))}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{String(t('admin_dashboard.due_expected', { defaultValue: 'Due Expected' } as any))}</div>
          <div className="mt-2 text-lg font-black text-white tabular-nums">{formatCurrency(cycle.totals.dueExpected, 0, currencyCode)}</div>
          <div className="mt-1 text-xs text-slate-500">{String(t('admin_dashboard.count_due', { count: cycle.counts.DUE || 0, defaultValue: '{{count}} due' } as any))}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{String(t('admin_dashboard.paid_total', { defaultValue: 'Paid Total' } as any))}</div>
          <div className="mt-2 text-lg font-black text-emerald-300 tabular-nums">{formatCurrency(cycle.totals.paid, 0, currencyCode)}</div>
          <div className="mt-1 text-xs text-slate-500">{String(t('admin_dashboard.count_paid', { count: cycle.counts.PAID || 0, defaultValue: '{{count}} paid' } as any))}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{String(t('admin_dashboard.past_due_total', { defaultValue: 'Past Due Total' } as any))}</div>
          <div className="mt-2 text-lg font-black text-amber-300 tabular-nums">{formatCurrency(cycle.totals.pastDue, 0, currencyCode)}</div>
          <div className="mt-1 text-xs text-slate-500">
            {String(t('admin_dashboard.count_past_due', { count: (cycle.counts.OVERDUE || 0) + (cycle.counts.DEFAULTED || 0), defaultValue: '{{count}} past due' } as any))}
          </div>
        </div>
      </div>

      <div className="md:hidden divide-y divide-white/5">
        {filtered.map((it) => {
          const due = typeof it.dueDate === 'string' ? new Date(it.dueDate) : it.dueDate;
          return (
            <div key={it.memberId} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{it.memberName}</div>
                  <div className="mt-1 text-xs text-slate-500">{String(t('common.due', { defaultValue: 'Due' } as any))}: {format(due, 'MMM d')}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-200 tabular-nums">{formatCurrency(it.amount, 0, currencyCode)}</div>
                </div>

                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${pillClasses(it.status)}`}>
                    {statusIcon(it.status)}
                    {statusLabel(it.status)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">{String(t('common.member', { defaultValue: 'Member' } as any))}</th>
              <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">{String(t('common.due', { defaultValue: 'Due' } as any))}</th>
              <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">{String(t('common.amount', { defaultValue: 'Amount' } as any))}</th>
              <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">{String(t('common.status', { defaultValue: 'Status' } as any))}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((it) => {
              const due = typeof it.dueDate === 'string' ? new Date(it.dueDate) : it.dueDate;
              return (
                <tr key={it.memberId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-medium">{it.memberName}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{format(due, 'MMM d')}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-200 tabular-nums">{formatCurrency(it.amount, 0, currencyCode)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${pillClasses(it.status)}`}>
                      {statusIcon(it.status)}
                      {statusLabel(it.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm">{String(t('admin_dashboard.no_items_filter', { defaultValue: 'No items for this filter.' } as any))}</div>
      ) : null}
    </section>
  );
}
