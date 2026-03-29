import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { investmentService } from '@/services/investment.service';
import { formatCurrency } from '@/utils/currencyFormatter';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Bot,
  Plus
} from 'lucide-react';

export function InvestmentDashboard() {
  const { t } = useTranslation();

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['investment-account'],
    queryFn: investmentService.getAccount,
  });

  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ['investment-portfolio'],
    queryFn: investmentService.getPortfolio,
    enabled: account?.status === 'ACTIVE',
  });

  const isLoading = accountLoading || portfolioLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!account || account.status === 'PENDING') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="glass-card p-10 md:p-16 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -z-10" />
          
          <div className="mx-auto w-24 h-24 bg-blue-600/20 rounded-3xl flex items-center justify-center border border-blue-500/30">
            <Bot size={48} className="text-blue-400" />
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            <h1 className="text-4xl font-black uppercase tracking-tight text-white">{t('investments.unlock_title')}</h1>
            <p className="text-slate-400 text-lg">
              {t('investments.unlock_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left py-6">
            <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3">
              <TrendingUp className="text-emerald-400" size={24} />
              <h3 className="font-bold text-white uppercase text-sm">{t('investments.wealth_growth')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t('investments.wealth_growth_desc', { currency: formatCurrency(100).split(' ')[0] })}</p>
            </div>
            <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3">
              <ArrowUpRight className="text-blue-400" size={24} />
              <h3 className="font-bold text-white uppercase text-sm">{t('investments.auto_investing')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t('investments.auto_investing_desc')}</p>
            </div>
            <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3">
              <Bot className="text-purple-400" size={24} />
              <h3 className="font-bold text-white uppercase text-sm">{t('investments.robo_advisor')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t('investments.robo_advisor_desc')}</p>
            </div>
          </div>

          <button 
            onClick={() => {/* Mock activation flow */}}
            className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-blue-900/50 active:scale-95"
          >
            {t('investments.activate_account')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6 md:py-8 animate-fade-in-up">
      {/* Header & Main Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 flex flex-col justify-center space-y-6">
          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">{t('investments.total_portfolio_value')}</p>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
                {formatCurrency(portfolio?.totalValue || 0)}
              </h1>
              <div className={`flex items-center gap-1 font-bold ${Number(portfolio?.totalGainLoss || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {Number(portfolio?.totalGainLoss || 0) >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span>{Math.abs(portfolio?.totalGainLossPercentage || 0).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{t('investments.cash_balance')}</p>
              <p className="text-lg font-bold text-white">{formatCurrency(portfolio?.cashBalance || 0)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{t('investments.invested')}</p>
              <p className="text-lg font-bold text-white">{formatCurrency(portfolio?.investedValue || 0)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{t('investments.total_return')}</p>
              <p className={`text-lg font-bold ${Number(portfolio?.totalGainLoss || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {Number(portfolio?.totalGainLoss || 0) >= 0 ? '+' : ''}{formatCurrency(portfolio?.totalGainLoss || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Bot size={120} />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-purple-400">
              <Bot size={12} /> {t('common.ai_powered', 'AI Powered')}
            </div>
            <h2 className="text-2xl font-bold text-white leading-tight">{t('investments.robo_rebalancing')}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t('investments.robo_rebalancing_desc', { risk: account.riskTolerance.toLowerCase() })}
            </p>
          </div>
          <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold uppercase tracking-widest text-sm transition-all relative z-10">
            {t('investments.view_recs')}
          </button>
        </div>
      </div>

      {/* Holdings Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest ml-1">{t('investments.your_holdings')}</h2>
          <div className="flex flex-wrap gap-3">
            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-slate-300 transition-all">
              <ArrowUpRight size={20} />
            </button>
            <button className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all w-full sm:w-auto">
              <Plus size={20} /> {t('investments.invest_more')}
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="md:hidden divide-y divide-white/5">
            {portfolio?.holdings.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic">
                {t('investments.no_holdings')}
              </div>
            ) : (
              portfolio?.holdings.map((holding) => (
                <div key={holding.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-blue-400 border border-white/10 flex-shrink-0">
                        {holding.symbol.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{holding.name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {holding.symbol} • {holding.quantity.toFixed(4)} {t('investments.shares')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-white tabular-nums">
                        {formatCurrency(holding.currentValue)}
                      </div>
                      <div className={`mt-2 text-xs font-bold flex items-center justify-end gap-1 ${holding.gainLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {holding.gainLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{holding.gainLossPercentage.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('investments.allocation')}</div>
                      <div className="mt-2 w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${(holding.currentValue / portfolio.investedValue) * 100}%` }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {((holding.currentValue / portfolio.investedValue) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('investments.gain_loss')}</div>
                      <div className={`mt-2 text-sm font-bold tabular-nums ${holding.gainLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{t('investments.avg_basis')}: {formatCurrency(holding.avgCostBasis)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-500">{t('investments.asset')}</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-500">{t('investments.allocation')}</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-500">{t('investments.current_value')}</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-500 text-right">{t('investments.gain_loss')}</th>
                </tr>
              </thead>
              <tbody>
                {portfolio?.holdings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-10 text-center text-slate-500 italic">
                      {t('investments.no_holdings')}
                    </td>
                  </tr>
                ) : (
                  portfolio?.holdings.map((holding) => (
                    <tr key={holding.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-blue-400 group-hover:scale-110 transition-transform">
                            {holding.symbol.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-white tracking-tight">{holding.name}</p>
                            <p className="text-xs text-slate-500">{holding.symbol} • {holding.quantity.toFixed(4)} {t('investments.shares')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="w-full max-w-[100px] h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${(holding.currentValue / portfolio.investedValue) * 100}%` }} 
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">
                          {((holding.currentValue / portfolio.investedValue) * 100).toFixed(1)}% {t('investments.of_invested')}
                        </p>
                      </td>
                      <td className="px-6 py-6">
                        <p className="font-bold text-white uppercase tracking-tight">
                          {formatCurrency(holding.currentValue)}
                        </p>
                        <p className="text-xs text-slate-500">{t('investments.avg_basis')}: {formatCurrency(holding.avgCostBasis)}</p>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className={`font-bold flex items-center justify-end gap-1 ${holding.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {holding.gainLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          <span>{holding.gainLossPercentage.toFixed(2)}%</span>
                        </div>
                        <p className={`text-xs ${holding.gainLoss >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                          {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
