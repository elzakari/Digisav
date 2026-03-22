import { formatDistanceToNow } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, User } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

export type RecentActivityItem = {
  id: string;
  timestamp: string | Date;
  transactionType: string;
  amount: number;
  currencyCode: string;
  member?: { user?: { fullName?: string } };
  recorder?: { fullName?: string };
};

type RecentActivityPanelProps = {
  items: RecentActivityItem[];
  currencyCode: string;
};

export function RecentActivityPanel({ items, currencyCode }: RecentActivityPanelProps) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between gap-4 bg-white/[0.02]">
        <div>
          <div className="text-sm font-black text-white tracking-tight">Recent Activity</div>
          <div className="text-xs text-slate-500 mt-1">Latest transactions and actions</div>
        </div>
        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Live</div>
      </div>

      <div className="divide-y divide-white/5">
        {items.map((it) => {
          const ts = typeof it.timestamp === 'string' ? new Date(it.timestamp) : it.timestamp;
          const isPayout = it.transactionType === 'PAYOUT';
          const memberName = it.member?.user?.fullName || 'Unknown';
          const recorderName = it.recorder?.fullName || 'System';

          return (
            <div key={it.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${isPayout ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                    {isPayout ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">
                      {isPayout ? 'Payout recorded' : 'Contribution recorded'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {memberName}
                      </span>
                      <span className="text-slate-700">•</span>
                      <span>by {recorderName}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-black tabular-nums ${isPayout ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {isPayout ? '-' : '+'}{formatCurrency(it.amount, 0, currencyCode)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{formatDistanceToNow(ts, { addSuffix: true })}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="p-10 text-center text-slate-500 text-sm">No recent activity yet.</div>
      ) : null}
    </section>
  );
}

