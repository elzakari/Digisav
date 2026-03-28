import { CalendarDays, CalendarRange } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type DashboardPeriod =
  | { kind: 'current_cycle'; fallbackRange: { from: string; to: string } }
  | { kind: 'range'; from: string; to: string; fallbackRange: { from: string; to: string } };

type DashboardPeriodSelectorProps = {
  value: DashboardPeriod;
  onChange: (next: DashboardPeriod) => void;
};

export function DashboardPeriodSelector({ value, onChange }: DashboardPeriodSelectorProps) {
  const { t } = useTranslation();
  const fromValue = value.kind === 'range' ? value.from : value.fallbackRange.from;
  const toValue = value.kind === 'range' ? value.to : value.fallbackRange.to;

  const setKind = (kind: DashboardPeriod['kind']) => {
    if (kind === value.kind) return;
    if (kind === 'current_cycle') {
      onChange({ kind: 'current_cycle', fallbackRange: { from: fromValue, to: toValue } });
      return;
    }
    onChange({ kind: 'range', from: fromValue, to: toValue, fallbackRange: { from: fromValue, to: toValue } });
  };

  const setFrom = (from: string) => {
    if (value.kind === 'range') {
      onChange({ ...value, from, fallbackRange: { from, to: value.to } });
    } else {
      onChange({ ...value, fallbackRange: { from, to: value.fallbackRange.to } });
    }
  };

  const setTo = (to: string) => {
    if (value.kind === 'range') {
      onChange({ ...value, to, fallbackRange: { from: value.from, to } });
    } else {
      onChange({ ...value, fallbackRange: { from: value.fallbackRange.from, to } });
    }
  };

  return (
    <div className="w-full">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setKind('current_cycle')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
            value.kind === 'current_cycle'
              ? 'bg-indigo-500/15 text-indigo-200 border-indigo-500/25'
              : 'bg-transparent text-white/60 border-transparent hover:bg-white/5'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          {String(t('admin_dashboard.period_current_cycle', { defaultValue: 'Current cycle' } as any))}
        </button>
        <button
          type="button"
          onClick={() => setKind('range')}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
            value.kind === 'range'
              ? 'bg-indigo-500/15 text-indigo-200 border-indigo-500/25'
              : 'bg-transparent text-white/60 border-transparent hover:bg-white/5'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          {String(t('admin_dashboard.period_date_range', { defaultValue: 'Date range' } as any))}
        </button>
      </div>

      {value.kind === 'range' ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fromValue}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/25"
          />
          <span className="text-xs text-white/40">{String(t('common.to', { defaultValue: 'to' } as any))}</span>
          <input
            type="date"
            value={toValue}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/25"
          />
        </div>
      ) : null}
    </div>
  );
}
