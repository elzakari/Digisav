import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES, isKnownRoutePath } from '@/routes/routeRegistry';
import { useRouteAuditStore } from '@/store/routeAudit.store';
import { authService } from '@/services/auth.service';

type StaticAuditRow = {
  source: 'nav' | 'page';
  label: string;
  from: string;
  to: string;
};

const STATIC_NAV_TARGETS: StaticAuditRow[] = [
  { source: 'nav', label: 'Group savings home', from: '(nav)', to: '/group-savings' },
  { source: 'nav', label: 'Micro savings home', from: '(nav)', to: '/micro-savings' },
  { source: 'nav', label: 'Admin dashboard', from: '(nav)', to: '/admin/dashboard' },
  { source: 'nav', label: 'Member dashboard', from: '(nav)', to: '/member/dashboard' },
  { source: 'nav', label: 'Overview', from: '(nav)', to: '/overview' },
  { source: 'nav', label: 'Savings', from: '(nav)', to: '/savings' },
  { source: 'nav', label: 'Investments', from: '(nav)', to: '/investments' },
  { source: 'nav', label: 'Settings', from: '(nav)', to: '/settings' },
  { source: 'nav', label: 'Audit', from: '(nav)', to: '/admin/groups/audit' },
];

export function RouteAuditPage() {
  const { t } = useTranslation();
  const enabled = useRouteAuditStore((s) => s.enabled);
  const setEnabled = useRouteAuditStore((s) => s.setEnabled);
  const findings = useRouteAuditStore((s) => s.findings);
  const clear = useRouteAuditStore((s) => s.clear);
  const user = authService.getCurrentUser();

  const rows = useMemo(() => {
    return STATIC_NAV_TARGETS.map((r) => ({
      ...r,
      ok: isKnownRoutePath(r.to),
    }));
  }, []);

  const canUse = user?.role === 'ADMIN' || user?.role === 'SYS_ADMIN';
  if (!canUse) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-lg font-black text-white">{String(t('common.forbidden', { defaultValue: 'Forbidden' } as any))}</div>
        <div className="mt-2 text-sm text-slate-400">{String(t('common.insufficient_permissions', { defaultValue: 'Insufficient permissions.' } as any))}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Route & Button Audit</h1>
          <div className="text-sm text-slate-400 mt-1">Shows known routes and flags attempted navigations to missing ones.</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-colors ${enabled
              ? 'bg-indigo-500/15 text-white border-indigo-500/25 hover:bg-indigo-500/20'
              : 'bg-white/[0.02] text-slate-300 border-white/10 hover:bg-white/[0.04]'
              }`}
          >
            {enabled ? 'Audit ON' : 'Audit OFF'}
          </button>
          <button
            type="button"
            onClick={clear}
            className="px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border bg-white/[0.02] text-slate-300 border-white/10 hover:bg-white/[0.04]"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Registered routes</div>
          <div className="mt-4 overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="py-2 pr-3">Path</th>
                  <th className="py-2">Label</th>
                </tr>
              </thead>
              <tbody>
                {ROUTES.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 text-sm">
                    <td className="py-2 pr-3 font-mono text-slate-300">{r.path}</td>
                    <td className="py-2 text-slate-400">{r.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Key navigation targets</div>
          <div className="mt-4 overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="py-2 pr-3">Label</th>
                  <th className="py-2 pr-3">To</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.source}-${r.label}-${r.to}`} className="border-t border-white/5 text-sm">
                    <td className="py-2 pr-3 text-slate-300">{r.label}</td>
                    <td className="py-2 pr-3 font-mono text-slate-400">{r.to}</td>
                    <td className="py-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${r.ok
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        }`}>
                        {r.ok ? 'OK' : 'Missing'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Live findings</div>
            <div className="mt-1 text-sm text-slate-400">Captured when Audit is ON and a missing route is clicked.</div>
          </div>
          <div className="text-xs text-slate-500 font-mono">{findings.length} items</div>
        </div>

        {findings.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">No findings yet.</div>
        ) : (
          <div className="mt-4 overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">From</th>
                  <th className="py-2 pr-3">To</th>
                  <th className="py-2">Label</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.id} className="border-t border-white/5 text-sm">
                    <td className="py-2 pr-3 text-slate-400 font-mono">{new Date(f.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-slate-300 font-mono">{f.fromPath}</td>
                    <td className="py-2 pr-3 text-rose-300 font-mono">{f.toPath}</td>
                    <td className="py-2 text-slate-400">{f.label || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
