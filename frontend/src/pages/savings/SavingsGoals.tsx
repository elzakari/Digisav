import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { savingsService } from '@/services/savings.service';
import { authService } from '@/services/auth.service';
import { Link } from 'react-router-dom';
import React from 'react';
import GoalCard from '@/components/savings/GoalCard';
import { formatCurrency } from '@/utils/currencyFormatter';
import { Trash2 } from 'lucide-react';

export function SavingsGoals() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = authService.getCurrentUser();
  const [optedOut, setOptedOut] = React.useState(user?.optedOutOfGroupSavings || false);

  const handleToggleParticipation = async () => {
    const newStatus = !optedOut;
    const confirmMessage = newStatus 
      ? t('savings.opt_out_confirm')
      : t('savings.opt_in_confirm');
    
    if (!window.confirm(confirmMessage)) return;

    try {
      await savingsService.toggleGroupParticipation(newStatus);
      setOptedOut(newStatus);
      // Update local storage user if needed
      const updatedUser = { ...user, optedOutOfGroupSavings: newStatus };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (error) {
      console.error('Failed to toggle participation', error);
      alert(t('savings.update_error'));
    }
  };

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['savings-summary'],
    queryFn: () => savingsService.getSummary(),
  });

  const { data: goals, isLoading: isGoalsLoading } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => savingsService.getGoals(),
  });

  const allGoals = goals?.data || [];
  const orphanGoals = allGoals.filter((g: any) => {
    if (!g.groupId) return true;
    if (!g.group) return true;
    if (g.group.groupType !== 'MICRO_SAVINGS') return true;
    if (g.group.status !== 'ACTIVE') return true;
    return false;
  });
  const validGoals = allGoals.filter((g: any) => !orphanGoals.some((o: any) => o.id === g.id));

  const handleDeleteOrphan = async (goal: any) => {
    const ok = window.confirm(`Delete orphan goal "${goal.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await savingsService.deleteGoal(goal.id);
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['savings-summary'] });
    } catch (e) {
      console.error('Failed to delete goal', e);
      alert('Could not delete this goal.');
    }
  };

  if (isSummaryLoading || isGoalsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-blue-400 font-medium text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-10 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-white uppercase">{t('savings.personal_savings_title')}</h1>
          <p className="text-slate-400">{t('savings.personal_savings_subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <label className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('savings.group_savings_label')}</span>
              <span className="text-xs text-white font-medium">{t('savings.participation_label')}</span>
            </div>
            <div 
              onClick={() => handleToggleParticipation()}
              className={`relative w-10 h-6 rounded-full transition-colors ${!optedOut ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${!optedOut ? 'left-5' : 'left-1'}`} />
            </div>
          </label>
          <Link 
            to="/savings/create"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('savings.new_savings_goal')}
          </Link>
        </div>
      </header>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t('savings.total_personal_savings')}</h3>
          <div className="text-3xl font-black text-white">
            {formatCurrency(Number(summary?.data?.totalSaved || 0), 0, summary?.data?.currencyCode || undefined)}
          </div>
          {summary?.data?.multiCurrency ? (
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              +{Math.max(0, (summary?.data?.totalsByCurrency?.length || 0) - 1)} more
            </div>
          ) : null}
        </div>
        <div className="glass-card p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t('savings.active_goals')}</h3>
          <div className="text-3xl font-black text-white">
            {summary?.data?.activeGoals || 0}
          </div>
        </div>
        <div className="glass-card p-6 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t('savings.savings_streak')}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{summary?.data?.currentStreak || 0}</span>
            <span className="text-amber-400 font-bold text-sm">{t('common.days')}</span>
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-2xl font-semibold text-slate-200 uppercase tracking-tight">{t('savings.your_goals')}</h2>
        </div>

        {orphanGoals.length ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-widest text-amber-200">Orphan goals</div>
                <div className="text-[11px] text-amber-100/70 mt-1">
                  These goals are no longer linked to an active Micro‑Savings group. You can delete them to keep your dashboard clean.
                </div>
              </div>
              <div className="text-xs font-bold text-amber-200">{orphanGoals.length}</div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {orphanGoals.map((goal: any) => (
                <div key={goal.id} className="relative overflow-hidden group transition-all duration-300">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-md border border-amber-500/20 rounded-2xl shadow-xl z-0" />
                  <div className="relative z-10 p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 inline-flex">
                          Orphan
                        </div>
                        <h3 className="mt-3 text-lg font-black text-white truncate">{goal.name}</h3>
                        <p className="text-white/60 text-sm mt-1 line-clamp-2">{goal.description || t('savings.no_desc')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteOrphan(goal)}
                        className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-rose-300 hover:text-rose-200 transition-colors"
                        title="Delete orphan goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-6">
                      <div className="text-2xl font-black text-white">
                        {formatCurrency(goal.currentAmount, 0, goal.currencyCode)}
                      </div>
                      <div className="text-white/40 text-xs font-medium mt-1">
                        {t('savings.saved_of')} {formatCurrency(goal.targetAmount, 0, goal.currencyCode)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {validGoals.length === 0 ? (
            <div className="col-span-full py-20 text-center glass-card rounded-2xl border-dashed">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase">{t('savings.no_goals_title')}</h3>
              <p className="text-slate-400 max-w-sm mx-auto mb-8">{t('savings.no_goals_desc')}</p>
              <Link 
                to="/savings/create"
                className="text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-widest text-sm"
              >
                {t('savings.create_first_goal')}
              </Link>
            </div>
          ) : (
            validGoals.map((goal: any) => (
              <GoalCard key={goal.id} goal={goal} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
