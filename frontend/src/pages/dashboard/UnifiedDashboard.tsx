import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { unifiedService, FinancialSummary } from '@/services/unified.service';
import { formatCurrency } from '@/utils/currencyFormatter';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  ShieldCheck, 
  PieChart as PieIcon, 
  ArrowRight,
  Target,
  Rocket,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function UnifiedDashboard() {
  const { t } = useTranslation();
  const { data: summary, isLoading } = useQuery<FinancialSummary>({
    queryKey: ['unified-summary'],
    queryFn: unifiedService.getSummary,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const current = summary?.current;
  const trends = summary?.trends || [];

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-widest text-xs">
            <ShieldCheck size={14} /> {t('dashboard.unified_view')}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{t('dashboard.net_worth')}</h1>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/investments" 
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2 text-sm"
          >
            {t('common.invest')} <ArrowUpRight size={16} />
          </Link>
          <Link 
            to="/savings/create" 
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/40 transition-all flex items-center gap-2 text-sm"
          >
            {t('common.new_goal')} <Target size={16} />
          </Link>
        </div>
      </header>

      {/* Hero Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-10 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -z-10 -mr-20 -mt-20 group-hover:bg-indigo-600/20 transition-colors duration-1000" />
          
          <div className="space-y-8 relative z-10">
            <div className="space-y-1 text-center lg:text-left">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">{t('dashboard.combined_net_value')}</p>
              <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter">
                {formatCurrency(current?.totalNetWorth || 0)}
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-white/5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-blue-500" /> {t('dashboard.group_equity')}
                </div>
                <p className="text-2xl font-black text-white">
                  {formatCurrency(current?.breakdown.groupContributions || 0)}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> {t('dashboard.personal_savings')}
                </div>
                <p className="text-2xl font-black text-white">
                  {formatCurrency(current?.breakdown.personalSavings || 0)}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" /> {t('dashboard.investments_label')}
                </div>
                <p className="text-2xl font-black text-white">
                  {formatCurrency(current?.breakdown.investments || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 bg-gradient-to-br from-indigo-600/20 to-transparent border-indigo-500/20 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
              <Rocket size={24} />
            </div>
            <h3 className="text-xl font-bold text-white leading-tight">{t('dashboard.growth_insight')}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t('dashboard.growth_insight_desc_part1')}
              {((current?.breakdown.personalSavings || 0) / (current?.totalNetWorth || 1) * 100).toFixed(1)}%
              {t('dashboard.growth_insight_desc_part2')}
            </p>
          </div>
          <Link to="/investments" className="group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all mt-6">
            <span className="text-sm font-bold text-white uppercase tracking-widest">{t('common.optimize_now')}</span>
            <ArrowRight size={18} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Trend Analysis Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-3">
          <TrendingUp className="text-indigo-400" size={20} /> {t('dashboard.growth_trend')}
        </h2>
        <div className="glass-card p-8 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                tickFormatter={(val) => `${val/1000}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '16px',
                  color: '#fff',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  fontSize: '10px',
                  letterSpacing: '1px'
                }}
                itemStyle={{ color: '#818cf8', padding: '0px' }}
                cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
              />
              <Area 
                type="monotone" 
                dataKey="netWorth" 
                stroke="#6366f1" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorNetWorth)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link to="/savings" className="glass-card p-6 flex items-center gap-6 hover:bg-white/[0.03] transition-all group">
          <div className="w-16 h-16 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-500">
            <Target size={28} />
          </div>
          <div className="flex-grow space-y-1">
            <h4 className="font-black text-white uppercase tracking-widest text-sm">{t('dashboard.savings_deep_dive')}</h4>
            <p className="text-xs text-slate-500">{t('dashboard.savings_deep_dive_desc')}</p>
          </div>
          <ArrowRight className="text-slate-700 group-hover:text-blue-400 transition-colors" size={24} />
        </Link>
        <Link to="/investments" className="glass-card p-6 flex items-center gap-6 hover:bg-white/[0.03] transition-all group">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-500">
            <PieIcon size={28} />
          </div>
          <div className="flex-grow space-y-1">
            <h4 className="font-black text-white uppercase tracking-widest text-sm">{t('dashboard.portfolio_analytics')}</h4>
            <p className="text-xs text-slate-500">{t('dashboard.portfolio_analytics_desc')}</p>
          </div>
          <ArrowRight className="text-slate-700 group-hover:text-emerald-400 transition-colors" size={24} />
        </Link>
      </div>
    </div>
  );
}
