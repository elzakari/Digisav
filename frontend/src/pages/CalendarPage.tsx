import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { groupService } from '@/services/group.service';
import { authService } from '@/services/auth.service';
import { useTranslation } from 'react-i18next';

export function CalendarPage() {
    const { t, i18n } = useTranslation();
    const user = authService.getCurrentUser();
    const isAdmin = user?.role === 'ADMIN';

    const { data: groups, isLoading: loadingGroups } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getMyGroups,
    });

    const [selectedGroupId, setSelectedGroupId] = useState<string>('');

    // Default selection to first group if not set
    const activeGroupId = selectedGroupId || (groups?.[0]?.id || '');

    const { data: calendarData, isLoading: loadingCalendar } = useQuery({
        queryKey: ['calendar', activeGroupId],
        queryFn: () => groupService.getCalendarData(activeGroupId),
        enabled: !!activeGroupId,
    });

    const [currentDate, setCurrentDate] = useState(new Date());

    if (loadingGroups) return <div className="animate-pulse text-indigo-400 p-8 text-center">{t('common.loading')}</div>;

    if (!groups || groups.length === 0) {
        return (
            <div className="glass-card p-12 text-center text-slate-400 mt-8">
                {t('calendar.no_groups')}
            </div>
        );
    }

    // --- Calendar logic ---
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDay = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const monthName = currentDate.toLocaleString(i18n.language, { month: 'long', year: 'numeric' });
    const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // Compute what to show on each day from calendarData
    // For simplicity, we flag days that have a contribution or a payment due
    const getDayEvents = (dayIndex: number) => {
        if (!calendarData) return [];

        const targetDateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayIndex).toISOString().split('T')[0];
        const events: any[] = [];

        // Find completed contributions on this day
        const dayContributions = calendarData.contributions?.filter((c: any) =>
            c.paymentDate && new Date(c.paymentDate).toISOString().split('T')[0] === targetDateStr
        );

        if (dayContributions?.length > 0) {
            if (isAdmin) {
                events.push({ type: 'PAID', label: `${dayContributions.length} ${t('calendar.payments_received')}` });
            } else {
                // If it's member, did *they* pay on this day?
                const myCont = dayContributions.find((c: any) => c.member.userId === user?.id);
                if (myCont) events.push({ type: 'PAID', label: t('calendar.my_payment_received') });
            }
        }

        // Determine upcoming expected due dates based on group start date
        // Simple mock logic for UI: if day is 5th of month, assume payout/due
        // (A real implementation would reconstruct exact dates from group.startDate & frequency)
        if (dayIndex === 5 && isAdmin) {
            events.push({ type: 'DUE', label: t('calendar.contribution_due') });
        }

        if (dayIndex === 28) {
            events.push({ type: 'PAYOUT', label: t('calendar.payout_day') });
        }

        return events;
    };

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    return (
        <div className="w-full space-y-8 animate-fade-in py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('calendar.title')}</h1>
                    <p className="text-slate-400">{t('calendar.subtitle')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={activeGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="glass-input max-w-[250px]"
                    >
                        {groups?.map((g: any) => (
                            <option key={g.id} value={g.id} className="bg-slate-900">{g.groupName}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                {/* Calendar Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white tracking-widest uppercase">{capitalizedMonthName}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="glass-button btn-secondary !px-4 py-1">&lt;</button>
                        <button onClick={nextMonth} className="glass-button btn-secondary !px-4 py-1">&gt;</button>
                    </div>
                </div>

                {loadingCalendar ? (
                    <div className="p-12 text-center text-slate-400 animate-pulse">{t('calendar.loading_data')}</div>
                ) : (
                    <div className="p-6">
                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mb-8 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div> {t('common.active')}</span>
                            <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div> {t('common.due')}</span>
                            <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div> {t('common.overdue')}</span>
                            <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div> {t('common.payout')}</span>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/10">
                            {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map((d) => (
                                <div key={d} className="bg-slate-900/80 p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    {d}
                                </div>
                            ))}

                            {/* Empty prefix boxes */}
                            {Array.from({ length: startDay }).map((_, i) => (
                                <div key={`empty-${i}`} className="bg-slate-900/50 min-h-[100px] p-2" />
                            ))}

                            {/* Day boxes */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const events = getDayEvents(day);

                                return (
                                    <div key={day} className="bg-slate-900/80 min-h-[100px] p-2 hover:bg-slate-800/80 transition-colors group cursor-pointer border border-transparent hover:border-white/10 relative">
                                        <span className="text-sm font-semibold text-slate-400 group-hover:text-white transition-colors">{day}</span>

                                        <div className="mt-2 space-y-1.5">
                                            {events.map((ev, ei) => (
                                                <div key={ei} className="px-2 py-1 text-[9px] rounded-md font-bold uppercase tracking-wider truncate
                          ${ev.type === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''}
                          ${ev.type === 'DUE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : ''}
                          ${ev.type === 'OVERDUE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : ''}
                          ${ev.type === 'PAYOUT' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : ''}
                        " style={{
                                                        backgroundColor: ev.type === 'PAID' ? 'rgba(16,185,129,0.1)' : ev.type === 'DUE' ? 'rgba(245,158,11,0.1)' : ev.type === 'PAYOUT' ? 'rgba(168,85,247,0.1)' : 'transparent',
                                                        color: ev.type === 'PAID' ? '#34d399' : ev.type === 'DUE' ? '#fbbf24' : ev.type === 'PAYOUT' ? '#c084fc' : '#fff',
                                                        border: `1px solid ${ev.type === 'PAID' ? 'rgba(16,185,129,0.2)' : ev.type === 'DUE' ? 'rgba(245,158,11,0.2)' : ev.type === 'PAYOUT' ? 'rgba(168,85,247,0.2)' : 'transparent'}`
                                                    }}>
                                                    {ev.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
