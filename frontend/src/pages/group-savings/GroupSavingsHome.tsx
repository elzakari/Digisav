import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeLink } from '@/components/common/SafeLink';
import { authService } from '@/services/auth.service';
import { CalendarDays, LayoutDashboard, Plus, Search, ShieldCheck } from 'lucide-react';

type Card = {
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
  tone: 'primary' | 'secondary';
};

export function GroupSavingsHome() {
  const { t } = useTranslation();
  const user = authService.getCurrentUser();

  const cards = useMemo<Card[]>(() => {
    if (!user) return [];

    if (user.role === 'ADMIN') {
      return [
        {
          title: String(t('common.dashboard', { defaultValue: 'Dashboard' } as any)),
          description: 'Manage your groups, members, and transactions.',
          to: '/admin/dashboard',
          icon: <LayoutDashboard className="w-5 h-5" />,
          tone: 'primary',
        },
        {
          title: 'Create group',
          description: 'Start a new savings group.',
          to: '/admin/groups/create',
          icon: <Plus className="w-5 h-5" />,
          tone: 'secondary',
        },
        {
          title: String(t('common.calendar', { defaultValue: 'Calendar' } as any)),
          description: 'See due dates and schedules.',
          to: '/admin/calendar',
          icon: <CalendarDays className="w-5 h-5" />,
          tone: 'secondary',
        },
        {
          title: 'Route & Button Audit',
          description: 'Find missing routes and broken navigation.',
          to: '/admin/groups/audit',
          icon: <ShieldCheck className="w-5 h-5" />,
          tone: 'secondary',
        },
      ];
    }

    return [
      {
        title: String(t('common.dashboard', { defaultValue: 'Dashboard' } as any)),
        description: 'View your savings groups and participation.',
        to: '/member/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        tone: 'primary',
      },
      {
        title: 'Join a group',
        description: 'Use an invite link or token to join.',
        to: '/join',
        icon: <Search className="w-5 h-5" />,
        tone: 'secondary',
      },
      {
        title: String(t('common.calendar', { defaultValue: 'Calendar' } as any)),
        description: 'See due dates and schedules.',
        to: '/member/calendar',
        icon: <CalendarDays className="w-5 h-5" />,
        tone: 'secondary',
      },
    ];
  }, [t, user]);

  return (
    <div className="w-full space-y-8 animate-fade-in">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Group savings</div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">Group Savings</h1>
        <div className="mt-2 text-sm text-slate-400">Manage savings groups, contributions, payouts, and schedules.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cards.map((c) => (
          <SafeLink
            key={c.to}
            to={c.to}
            auditLabel={`GroupSavingsHome:${c.title}`}
            className={`glass-card p-6 rounded-3xl border transition-all hover:bg-white/[0.03] ${c.tone === 'primary'
              ? 'border-indigo-500/20'
              : 'border-white/10'
              }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${c.tone === 'primary'
                ? 'bg-indigo-500/15 border-indigo-500/25 text-indigo-300'
                : 'bg-white/[0.03] border-white/10 text-slate-200'
                }`}>
                {c.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-white tracking-tight">{c.title}</div>
                <div className="mt-1 text-xs text-slate-400">{c.description}</div>
              </div>
            </div>
          </SafeLink>
        ))}
      </div>
    </div>
  );
}
