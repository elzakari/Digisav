import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notification.service';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data: response } = useQuery({
        queryKey: ['notifications'],
        queryFn: notificationService.getMyNotifications,
        refetchInterval: 30000, // Poll every 30s
    });

    const notifications = response?.data || [];
    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    const markReadMutation = useMutation({
        mutationFn: (id: string) => notificationService.markAsRead(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => notificationService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            setIsOpen(false);
        },
    });

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'PAYMENT_RECEIVED': return '💰';
            case 'PAYMENT_REMINDER': return '⏱️';
            case 'PAYMENT_OVERDUE': return '⚠️';
            case 'MEMBER_JOINED': return '👥';
            case 'GROUP_ACTIVATED': return '🚀';
            default: return '🔔';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold text-white items-center justify-center border-2 border-slate-900">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up origin-top-right">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllReadMutation.mutate()}
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <p>No notifications yet.</p>
                            </div>
                        ) : (
                            notifications.map((notif: any) => (
                                <div
                                    key={notif.id}
                                    className={`p-4 transition-colors hover:bg-white/[0.02] cursor-pointer ${!notif.isRead ? 'bg-indigo-500/5' : ''
                                        }`}
                                    onClick={() => {
                                        if (!notif.isRead) markReadMutation.mutate(notif.id);
                                    }}
                                >
                                    <div className="flex gap-3 items-start">
                                        <span className="text-2xl leading-none mt-1">
                                            {getIconForType(notif.type)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm tracking-tight ${!notif.isRead ? 'font-semibold text-white' : 'font-medium text-slate-300'}`}>
                                                {notif.title}
                                            </p>
                                            <p className={`text-sm mt-1 leading-snug ${!notif.isRead ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                                                {notif.body}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-wider">
                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
