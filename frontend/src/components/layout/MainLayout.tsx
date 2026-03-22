import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/common/NotificationBell';
import { authService } from '@/services/auth.service';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t, i18n: i18nInstance } = useTranslation();
    const user = authService.getCurrentUser();
 
    React.useEffect(() => {
        if (user?.theme) {
            document.documentElement.setAttribute('data-theme', user.theme);
        }
        const current = (i18nInstance.resolvedLanguage || i18nInstance.language || 'en').split('-')[0];
        if (user?.language && user.language !== current) {
            i18nInstance.changeLanguage(user.language);
        }
    }, [user?.theme, user?.language, i18nInstance]);

    const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen w-full relative overflow-x-hidden flex flex-col">
            {/* Animated Mesh Background */}
            <div className="bg-mesh" aria-hidden="true" />

            {/* Global Header */}
            {!isAuthPage && user && (
                <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/50 border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <Link to={user.role === 'SYS_ADMIN' ? '/sysadmin/dashboard' : user.role === 'ADMIN' ? '/admin/dashboard' : '/overview'} className="text-xl font-black text-white tracking-tight">
                                Digi<span className="text-indigo-400">Sav</span>
                            </Link>

                            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                                {user.role === 'MEMBER' && (
                                    <Link
                                        to="/overview"
                                        className={`transition-colors hover:text-white ${location.pathname === '/overview' ? 'text-white' : 'text-slate-400'}`}
                                    >
                                        Overview
                                    </Link>
                                )}

                                <Link
                                    to={user.role === 'SYS_ADMIN' ? '/sysadmin/dashboard' : user.role === 'ADMIN' ? '/admin/dashboard' : '/member/dashboard'}
                                    className={`transition-colors hover:text-white ${location.pathname.includes('/dashboard') ? 'text-white' : 'text-slate-400'}`}
                                >
                                    {t('common.dashboard')}
                                </Link>

                                {user.role === 'SYS_ADMIN' ? (
                                    <>
                                        <Link
                                            to="/sysadmin/users"
                                            className={`transition-colors hover:text-white ${location.pathname.includes('/users') ? 'text-white' : 'text-slate-400'}`}
                                        >
                                            Users Directory
                                        </Link>
                                        <Link
                                            to="/sysadmin/groups"
                                            className={`transition-colors hover:text-white ${location.pathname.includes('/sysadmin/groups') ? 'text-white' : 'text-slate-400'}`}
                                        >
                                            Groups Moderation
                                        </Link>
                                    </>
                                ) : (
                                    <Link
                                        to={user.role === 'ADMIN' ? '/admin/calendar' : '/member/calendar'}
                                        className={`transition-colors hover:text-white ${location.pathname.includes('/calendar') ? 'text-white' : 'text-slate-400'}`}
                                    >
                                        {t('common.calendar')}
                                    </Link>
                                )}

                                {user.role !== 'SYS_ADMIN' && (
                                    <Link
                                        to="/savings"
                                        className={`transition-colors hover:text-white ${location.pathname.includes('/savings') ? 'text-white' : 'text-slate-400'}`}
                                    >
                                        Savings
                                    </Link>
                                )}

                                {user.role !== 'SYS_ADMIN' && (
                                    <Link
                                        to="/investments"
                                        className={`transition-colors hover:text-white ${location.pathname.includes('/investments') ? 'text-white' : 'text-slate-400'}`}
                                    >
                                        Investments
                                    </Link>
                                )}

                                <Link
                                    to="/settings"
                                    className={`transition-colors hover:text-white ${location.pathname.includes('/settings') ? 'text-white' : 'text-slate-400'}`}
                                >
                                    {t('common.settings')}
                                </Link>
                            </nav>
                        </div>

                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                            <NotificationBell />

                            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                                <div className="hidden sm:block text-right">
                                    <div className="text-sm font-bold text-slate-200 leading-none mb-1">{user.fullName}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">{t(`role.${user.role}`)}</div>
                                </div>
                                <button
                                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                    onClick={handleLogout}
                                    title={t('common.logout')}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {/* Content Container */}
            <main className="flex-grow flex flex-col p-4 md:p-8 relative z-10 w-full max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
};
