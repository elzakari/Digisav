import { useTranslation } from 'react-i18next';
import { SafeLink } from '@/components/common/SafeLink';
import { BarChart3, PiggyBank, PlusCircle, TrendingUp } from 'lucide-react';

export function MicroSavingsHome() {
  const { t } = useTranslation();

  return (
    <div className="w-full space-y-8 animate-fade-in">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Micro savings</div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">Micro Savings</h1>
        <div className="mt-2 text-sm text-slate-400">Personal savings goals and micro-investments.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <SafeLink
          to="/savings"
          auditLabel="MicroSavingsHome:Savings"
          className="glass-card p-6 rounded-3xl border border-white/10 hover:bg-white/[0.03] transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-300 flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-tight">Savings</div>
              <div className="mt-1 text-xs text-slate-400">View and manage your savings goals.</div>
            </div>
          </div>
        </SafeLink>

        <SafeLink
          to="/savings/create"
          auditLabel="MicroSavingsHome:NewGoal"
          className="glass-card p-6 rounded-3xl border border-indigo-500/20 hover:bg-white/[0.03] transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-tight">{String(t('common.new_goal', { defaultValue: 'New goal' } as any))}</div>
              <div className="mt-1 text-xs text-slate-400">Create a new savings goal.</div>
            </div>
          </div>
        </SafeLink>

        <SafeLink
          to="/investments"
          auditLabel="MicroSavingsHome:Investments"
          className="glass-card p-6 rounded-3xl border border-white/10 hover:bg-white/[0.03] transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-tight">Investments</div>
              <div className="mt-1 text-xs text-slate-400">Optimize and track your portfolio.</div>
            </div>
          </div>
        </SafeLink>
      </div>

      <SafeLink
        to="/overview"
        auditLabel="MicroSavingsHome:Overview"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
      >
        <BarChart3 className="w-4 h-4" />
        {String(t('dashboard.unified_view', { defaultValue: 'Unified view' } as any))}
      </SafeLink>
    </div>
  );
}

