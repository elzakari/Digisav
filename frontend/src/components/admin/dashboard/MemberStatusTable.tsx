import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

type TontineItem = {
  memberId: string;
  memberName: string;
  expected: number;
  paid: number;
  outstanding: number;
  status: 'PAID' | 'DUE' | 'PAST_DUE';
  lastPaymentDate: string | Date | null;
  currencyCode: string;
};

type MicroSavingsItem = {
  memberId: string;
  memberName: string;
  balance: number;
  deposits: number;
  withdrawals: number;
  netChange: number;
  currencyCode: string;
};

export type MemberStatusData =
  | { kind: 'tontine'; items: TontineItem[] }
  | { kind: 'micro_savings'; items: MicroSavingsItem[] };

type MemberStatusTableProps = {
  data: MemberStatusData;
  currencyCode: string;
};

function statusPill(status: 'PAID' | 'DUE' | 'PAST_DUE') {
  if (status === 'PAID') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (status === 'PAST_DUE') return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
  return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25';
}

function statusIcon(status: 'PAID' | 'DUE' | 'PAST_DUE') {
  if (status === 'PAID') return <CheckCircle2 className="w-4 h-4" />;
  if (status === 'PAST_DUE') return <AlertTriangle className="w-4 h-4" />;
  return <Clock className="w-4 h-4" />;
}

export function MemberStatusTable({ data, currencyCode }: MemberStatusTableProps) {
  const [filter, setFilter] = useState<'due' | 'paid' | 'past_due'>('due');

  const tontineItems = data.kind === 'tontine' ? data.items : null;
  const microItems = data.kind === 'micro_savings' ? data.items : null;

  const filteredTontine = useMemo(() => {
    if (!tontineItems) return [];
    if (filter === 'paid') return tontineItems.filter((i) => i.status === 'PAID');
    if (filter === 'past_due') return tontineItems.filter((i) => i.status === 'PAST_DUE');
    return tontineItems.filter((i) => i.status === 'DUE');
  }, [filter, tontineItems]);

  return (
    <section className="glass-card overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between gap-4 bg-white/[0.02]">
        <div>
          <div className="text-sm font-black text-white tracking-tight">Member status</div>
          <div className="text-xs text-slate-500 mt-1">
            {data.kind === 'tontine' ? 'Expected vs paid for the selected period' : 'Balances and flows for the selected period'}
          </div>
        </div>

        {data.kind === 'tontine' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('due')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${
                filter === 'due'
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              Due
            </button>
            <button
              type="button"
              onClick={() => setFilter('paid')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${
                filter === 'paid'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setFilter('past_due')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${
                filter === 'past_due'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              Past due
            </button>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto no-scrollbar">
        {tontineItems ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Member</th>
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Expected</th>
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Paid</th>
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Outstanding</th>
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Last payment</th>
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTontine.map((it) => {
                const last = it.lastPaymentDate
                  ? format(typeof it.lastPaymentDate === 'string' ? new Date(it.lastPaymentDate) : it.lastPaymentDate, 'MMM d, yyyy')
                  : '—';

                return (
                  <tr key={it.memberId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{it.memberName}</td>
                    <td className="px-6 py-4 text-sm text-slate-200 tabular-nums">{formatCurrency(it.expected, 0, currencyCode)}</td>
                    <td className="px-6 py-4 text-sm text-emerald-300 tabular-nums">{formatCurrency(it.paid, 0, currencyCode)}</td>
                    <td className="px-6 py-4 text-sm text-amber-300 tabular-nums">{formatCurrency(it.outstanding, 0, currencyCode)}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{last}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${statusPill(it.status)}`}>
                        {statusIcon(it.status)}
                        {it.status === 'PAID' ? 'Paid' : it.status === 'PAST_DUE' ? 'Past due' : 'Due'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {microItems ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Member</th>
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Balance</th>
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Deposits</th>
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Withdrawals</th>
                <th className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {microItems.map((it) => (
                <tr key={it.memberId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-medium">{it.memberName}</td>
                  <td className="px-6 py-4 text-sm text-slate-200 tabular-nums">{formatCurrency(it.balance, 0, currencyCode)}</td>
                  <td className="px-6 py-4 text-sm text-emerald-300 tabular-nums">{formatCurrency(it.deposits, 0, currencyCode)}</td>
                  <td className="px-6 py-4 text-sm text-rose-300 tabular-nums">{formatCurrency(it.withdrawals, 0, currencyCode)}</td>
                  <td className={`px-6 py-4 text-sm tabular-nums ${it.netChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {formatCurrency(it.netChange, 0, currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {data.kind === 'tontine' && filteredTontine.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm">No members for this filter.</div>
      ) : null}

      {data.kind === 'micro_savings' && microItems && microItems.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm">No members yet.</div>
      ) : null}
    </section>
  );
}
