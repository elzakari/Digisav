import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/common/NotificationBell';
import { authService } from '@/services/auth.service';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { SafeLink } from '@/components/common/SafeLink';
import { useProductNavStore } from '@/store/productNav.store';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t, i18n: i18nInstance } = useTranslation();
    const user = authService.getCurrentUser();
    const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
    const product = useProductNavStore((s) => s.product);
    const setProduct = useProductNavStore((s) => s.setProduct);
    const [platformMenuOpen, setPlatformMenuOpen] = React.useState(false);
 
    React.useEffect(() => {
        if (user?.theme) {
            document.documentElement.setAttribute('data-theme', user.theme);
        }
        const current = (i18nInstance.resolvedLanguage || i18nInstance.language || 'en').split('-')[0];
        if (user?.language && user.language !== current) {
            i18nInstance.changeLanguage(user.language);
        }
    }, [user?.theme, user?.language, i18nInstance]);

    React.useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    React.useEffect(() => {
        if (!platformMenuOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPlatformMenuOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [platformMenuOpen]);

    React.useEffect(() => {
        const p = location.pathname;
        if (p.startsWith('/savings') || p.startsWith('/investments') || p.startsWith('/micro-savings')) {
            setProduct('micro');
            return;
        }
        if (p.startsWith('/group-savings') || p.startsWith('/admin') || p.startsWith('/member') || p.startsWith('/join') || p.startsWith('/overview')) {
            setProduct('group');
        }
    }, [location.pathname, setProduct]);

    React.useEffect(() => {
        if (!mobileNavOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [mobileNavOpen]);

    const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const navItems = React.useMemo(() => {
        if (!user) return [] as Array<{ to: string; label: string; active: (path: string) => boolean }>;

        const items: Array<{ to: string; label: string; active: (path: string) => boolean }> = [];

        const isSystemAdmin = user.role === 'SYS_ADMIN';
        const isGroupAdmin = user.role === 'ADMIN';

        if (isSystemAdmin) {
            items.push({
                to: '/sysadmin/dashboard',
                label: String(t('nav.platform_overview', { defaultValue: 'Platform Overview' } as any)),
                active: (p) => p.includes('/sysadmin/dashboard'),
            });
            items.push({
                to: '/sysadmin/users',
                label: String(t('nav.users_directory', { defaultValue: 'Users Directory' } as any)),
                active: (p) => p.includes('/sysadmin/users') || p.includes('/users'),
            });
            items.push({
                to: '/sysadmin/groups',
                label: String(t('nav.groups_moderation', { defaultValue: 'Groups Moderation' } as any)),
                active: (p) => p.includes('/sysadmin/groups'),
            });
            items.push({
                to: '/admin/groups/audit',
                label: String(t('nav.audit', { defaultValue: 'Audit' } as any)),
                active: (p) => p.includes('/admin/groups/audit'),
            });
            items.push({
                to: '/settings',
                label: t('common.settings'),
                active: (p) => p.includes('/settings'),
            });
            return items;
        }

        if (product === 'group') {
            if (user.role === 'MEMBER') {
                items.push({
                    to: '/overview',
                    label: 'Overview',
                    active: (p) => p === '/overview',
                });
            }

            items.push({
                to: isSystemAdmin || isGroupAdmin ? '/admin/dashboard' : '/member/dashboard',
                label: t('common.dashboard'),
                active: (p) => p.includes('/dashboard') && !p.includes('/sysadmin'),
            });

            items.push({
                to: isSystemAdmin || isGroupAdmin ? '/admin/calendar' : '/member/calendar',
                label: t('common.calendar'),
                active: (p) => p.includes('/calendar'),
            });

            if (isSystemAdmin || isGroupAdmin) {
                items.push({
                    to: '/admin/groups/audit',
                    label: 'Audit',
                    active: (p) => p.includes('/admin/groups/audit'),
                });
            }
        } else {
            items.push({
                to: '/savings',
                label: 'Savings',
                active: (p) => p.includes('/savings'),
            });
            items.push({
                to: '/investments',
                label: 'Investments',
                active: (p) => p.includes('/investments'),
            });
        }

        items.push({
            to: '/settings',
            label: t('common.settings'),
            active: (p) => p.includes('/settings'),
        });

        return items;
    }, [product, t, user]);

    const isPlatformAdmin = user?.role === 'SYS_ADMIN';
    const canSwitchProduct = !!user && !isPlatformAdmin;

    const brandHref = !user
        ? '/login'
        : user.role === 'SYS_ADMIN'
            ? '/sysadmin/dashboard'
            : user.role === 'MEMBER'
                ? '/overview'
                : '/admin/dashboard';

    return (
        <div className="min-h-screen w-full relative overflow-x-hidden flex flex-col">
            {/* Animated Mesh Background */}
            <div className="bg-mesh" aria-hidden="true" />

            {/* Global Header */}
            {!isAuthPage && user && (
                <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/50 border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-8">
                            <button
                                type="button"
                                className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                                onClick={() => setMobileNavOpen(true)}
                                aria-label="Open navigation"
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            <SafeLink to={brandHref} className="text-xl font-black text-white tracking-tight" auditLabel="Brand">
                                Germ<span className="text-indigo-400">inos</span>
                            </SafeLink>

                            {isPlatformAdmin ? (
                                <span className="hidden md:inline-flex items-center px-3 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-200">
                                    {String(t('nav.platform', { defaultValue: 'Platform' } as any))}
                                </span>
                            ) : null}

                            {canSwitchProduct && (
                                <div className="hidden md:flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProduct('group');
                                            navigate('/group-savings');
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${product === 'group'
                                            ? 'bg-indigo-500/20 text-white'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Group
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProduct('micro');
                                            navigate('/micro-savings');
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${product === 'micro'
                                            ? 'bg-emerald-500/20 text-white'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Micro
                                    </button>
                                </div>
                            )}

                            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                                {navItems.map((it) => (
                                    <SafeLink
                                        key={it.to}
                                        to={it.to}
                                        auditLabel={`Nav:${it.label}`}
                                        className={`transition-colors hover:text-white ${it.active(location.pathname) ? 'text-white' : 'text-slate-400'}`}
                                    >
                                        {it.label}
                                    </SafeLink>
                                ))}
                            </nav>
                        </div>

                        <div className="flex items-center gap-4">
                            {isPlatformAdmin ? (
                                <div className="relative hidden md:block">
                                    <button
                                        type="button"
                                        onClick={() => setPlatformMenuOpen((v) => !v)}
                                        className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs font-bold text-slate-200 flex items-center gap-2"
                                    >
                                        {String(t('nav.quick_actions', { defaultValue: 'Quick' } as any))}
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    </button>
                                    {platformMenuOpen ? (
                                        <div className="absolute right-0 top-11 z-50 w-56 bg-slate-950/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                            {[{ to: '/sysadmin/users', label: String(t('nav.users_directory', { defaultValue: 'Users Directory' } as any)) },
                                              { to: '/sysadmin/groups', label: String(t('nav.groups_moderation', { defaultValue: 'Groups Moderation' } as any)) },
                                              { to: '/admin/groups/audit', label: String(t('nav.audit', { defaultValue: 'Audit' } as any)) },
                                              { to: '/settings', label: t('common.settings') }].map((x) => (
                                                <SafeLink
                                                    key={x.to}
                                                    to={x.to}
                                                    auditLabel={`Quick:${x.label}`}
                                                    className="block w-full px-4 py-3 text-sm text-left text-slate-200 hover:bg-white/10 transition-colors"
                                                    onClick={() => setPlatformMenuOpen(false) as any}
                                                >
                                                    {x.label}
                                                </SafeLink>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
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
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {!isAuthPage && user && (
                <div className={`fixed inset-0 z-50 md:hidden ${mobileNavOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileNavOpen}>
                    <div
                        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${mobileNavOpen ? 'opacity-100' : 'opacity-0'}`}
                        onClick={() => setMobileNavOpen(false)}
                    />
                    <div
                        className={`absolute inset-y-0 left-0 w-[86%] max-w-sm bg-slate-950/95 border-r border-white/10 shadow-2xl transition-transform duration-300 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation"
                    >
                        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
                            <SafeLink
                                to={brandHref}
                                className="text-lg font-black text-white tracking-tight"
                                auditLabel="Brand"
                            >
                                Germ<span className="text-indigo-400">inos</span>
                            </SafeLink>
                            <button
                                type="button"
                                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                                onClick={() => setMobileNavOpen(false)}
                                aria-label="Close navigation"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-2">
                            {canSwitchProduct && (
                                <div className="p-2 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProduct('group');
                                            navigate('/group-savings');
                                        }}
                                        className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${product === 'group'
                                            ? 'bg-indigo-500/20 text-white'
                                            : 'text-slate-400'
                                            }`}
                                    >
                                        Group
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProduct('micro');
                                            navigate('/micro-savings');
                                        }}
                                        className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${product === 'micro'
                                            ? 'bg-emerald-500/20 text-white'
                                            : 'text-slate-400'
                                            }`}
                                    >
                                        Micro
                                    </button>
                                </div>
                            )}
                            {navItems.map((it) => (
                                <SafeLink
                                    key={it.to}
                                    to={it.to}
                                    auditLabel={`Nav:${it.label}`}
                                    className={`block w-full px-4 py-3 rounded-2xl text-sm font-semibold transition-colors border ${it.active(location.pathname)
                                        ? 'bg-indigo-500/15 text-white border-indigo-500/25'
                                        : 'bg-white/[0.02] text-slate-300 border-white/10 hover:bg-white/[0.04]'
                                        }`}
                                >
                                    {it.label}
                                </SafeLink>
                            ))}
                        </div>

                        <div className="absolute left-0 right-0 bottom-0 p-4 border-t border-white/10">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/15 transition-colors flex items-center justify-center gap-2 font-semibold"
                            >
                                <LogOut className="w-4 h-4" />
                                {t('common.logout')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Container */}
            <main className="flex-grow flex flex-col px-4 py-6 sm:px-6 md:px-8 md:py-8 relative z-10 w-full max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
};
