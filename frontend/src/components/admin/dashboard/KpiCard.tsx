import { type ReactNode } from 'react';

type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  onClick?: () => void;
};

export function KpiCard({ title, value, hint, icon, onClick }: KpiCardProps) {
  const clickable = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`glass-card p-6 text-left w-full transition-all ${clickable ? 'hover:bg-white/[0.04] hover:border-white/10 active:scale-[0.99] cursor-pointer' : 'cursor-default opacity-100'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {title}
          </div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tight tabular-nums">
            {value}
          </div>
          {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
        </div>

        {icon ? (
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-300">
            {icon}
          </div>
        ) : null}
      </div>
    </button>
  );
}

