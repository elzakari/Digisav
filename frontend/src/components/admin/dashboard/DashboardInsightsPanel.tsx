import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currencyFormatter';

type DashboardInsightsPanelProps = {
  dashboard: any;
  currencyCode: string;
};

export function DashboardInsightsPanel({ dashboard, currencyCode }: DashboardInsightsPanelProps) {
  const { t } = useTranslation();
  const collectedByCycle = dashboard?.insights?.collectedByCycle || [];
  const lineData = collectedByCycle.map((d: any) => ({
    label: `C${d.cycleNumber}`,
    collected: Number(d.collected || 0),
  }));

  const collected = Number(dashboard?.common?.totalCollected?.amount || 0);
  const outstanding = Number(dashboard?.common?.totalOutstanding?.amount || 0);
  const pieData = [
    { name: String(t('admin_dashboard.collected', { defaultValue: 'Collected' } as any)), value: Math.max(0, collected) },
    { name: String(t('admin_dashboard.outstanding', { defaultValue: 'Outstanding' } as any)), value: Math.max(0, outstanding) },
  ];

  return (
    <section className="glass-card overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between gap-4 bg-white/[0.02]">
        <div>
          <div className="text-sm font-black text-white tracking-tight">{String(t('admin_dashboard.insights_title', { defaultValue: 'Insights' } as any))}</div>
          <div className="text-xs text-slate-500 mt-1">{String(t('admin_dashboard.insights_desc', { defaultValue: 'Collected over time and distribution' } as any))}</div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{String(t('admin_dashboard.collected_over_time', { defaultValue: 'Collected over time' } as any))}</div>
          <div className="mt-4 h-44">
            {lineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(148,163,184,0.8)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="rgba(148,163,184,0.8)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(2, 6, 23, 0.92)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}
                    formatter={(v: any) => formatCurrency(Number(v || 0), 0, currencyCode)}
                  />
                  <Line
                    type="monotone"
                    dataKey="collected"
                    stroke="rgba(99, 102, 241, 0.95)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">{String(t('common.no_data', { defaultValue: 'No data' } as any))}</div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{String(t('admin_dashboard.paid_vs_outstanding', { defaultValue: 'Paid vs outstanding' } as any))}</div>
          <div className="mt-4 h-44 flex items-center justify-between gap-4">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(2, 6, 23, 0.92)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                    }}
                    formatter={(v: any) => formatCurrency(Number(v || 0), 0, currencyCode)}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    <Cell fill="rgba(16, 185, 129, 0.9)" />
                    <Cell fill="rgba(245, 158, 11, 0.9)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{String(t('admin_dashboard.collected', { defaultValue: 'Collected' } as any))}</div>
                <div className="mt-1 text-lg font-black text-emerald-300 tabular-nums">
                  {formatCurrency(collected, 0, currencyCode)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{String(t('admin_dashboard.outstanding', { defaultValue: 'Outstanding' } as any))}</div>
                <div className="mt-1 text-lg font-black text-amber-300 tabular-nums">
                  {formatCurrency(outstanding, 0, currencyCode)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
