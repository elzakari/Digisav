import React from 'react';
import { useTranslation } from 'react-i18next';
import { savingsService, SavingsGoal } from '../../services/savings.service';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/utils/currencyFormatter';

interface GoalCardProps {
  goal: SavingsGoal;
  onClick?: (goal: SavingsGoal) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onClick }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

  const handleAction = async (action: 'withdraw' | 'reinvest') => {
    const feePercent = 2;
    const feeAmount = (goal.currentAmount * feePercent) / 100;
    const netAmount = goal.currentAmount - feeAmount;

    const message = action === 'withdraw' 
      ? t('savings.withdraw_confirm', { 
          currency: goal.currencyCode, 
          amount: goal.currentAmount.toLocaleString(), 
          percent: feePercent, 
          fee: feeAmount.toLocaleString() 
        })
      : t('savings.reinvest_confirm', { 
          currency: goal.currencyCode, 
          amount: goal.currentAmount.toLocaleString(), 
          percent: feePercent, 
          fee: feeAmount.toLocaleString(), 
          net: netAmount.toLocaleString() 
        });

    if (!window.confirm(message)) return;

    setIsProcessing(true);
    try {
      if (action === 'withdraw') {
        await savingsService.withdrawGoal(goal.id);
      } else {
        await savingsService.reinvestFromSavings(goal.id);
      }
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['savings-summary'] });
      queryClient.invalidateQueries({ queryKey: ['investments-account'] });
    } catch (error) {
      console.error(`Failed to ${action}`, error);
      alert(t('savings.action_error', { action }));
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      EMERGENCY_FUND: 'from-red-500 to-orange-500',
      EDUCATION: 'from-blue-500 to-indigo-500',
      HOUSING: 'from-green-500 to-teal-500',
      BUSINESS: 'from-purple-500 to-pink-500',
      TRAVEL: 'from-yellow-400 to-orange-400',
      ELECTRONICS: 'from-cyan-500 to-blue-500',
    };
    return colors[category] || 'from-gray-500 to-slate-500';
  };

  return (
    <div 
      onClick={() => onClick?.(goal)}
      className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-1"
    >
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl z-0" />
      
      <div className="relative z-10 p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r ${getCategoryColor(goal.category)}`}>
            {t(`categories.${goal.category}`, goal.category.replace('_', ' '))}
          </div>
          <div className="text-white/60 text-xs font-medium">
            {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : t('savings.no_deadline')}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors uppercase">
          {goal.name}
        </h3>
        
        <p className="text-white/60 text-sm mb-6 line-clamp-2">
          {goal.description || t('savings.no_desc')}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className="text-2xl font-black text-white">
                {formatCurrency(goal.currentAmount, 0, goal.currencyCode)}
              </span>
              <span className="text-white/40 text-xs ml-1 font-medium">
                {t('savings.saved_of')} {formatCurrency(goal.targetAmount, 0, goal.currencyCode)}
              </span>
            </div>
            <div className="text-blue-400 font-bold text-lg">
              {Math.round(progress)}%
            </div>
          </div>

          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full bg-gradient-to-r ${getCategoryColor(goal.category)} transition-all duration-1000 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {goal.status === 'ACTIVE' && goal.currentAmount > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('withdraw');
                }}
                disabled={isProcessing}
                className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isProcessing ? '...' : (
                  <>
                    <span>{t('common.request')}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </>
                )}
              </button>

              {goal.group?.allowMicroInvestments !== false ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction('reinvest');
                  }}
                  disabled={isProcessing}
                  className="py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:bg-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? '...' : t('common.reinvest')}
                </button>
              ) : (
                <div 
                  className="py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center"
                  title={t('savings.invest_disabled')}
                >
                  {t('common.invest')} <span className="ml-1 opacity-50">🔒</span>
                </div>
              )}
            </div>
          )}

          {goal.status === 'COMPLETED' && (
            <div className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-400 text-center">
              {t('savings.target_reached')}
            </div>
          )}
        </div>
      </div>

      {/* Decorative accent */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br ${getCategoryColor(goal.category)} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
    </div>
  );
};

export default GoalCard;
