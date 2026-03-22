import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { userService } from '@/services/user.service';
import { authService } from '@/services/auth.service';
import { ChevronDown } from 'lucide-react';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const currentLang = useMemo(() => {
        const lang = (i18n.resolvedLanguage || i18n.language || 'en').toString();
        return lang.split('-')[0];
    }, [i18n.language, i18n.resolvedLanguage]);

    const languages = useMemo(
        () => [
            { code: 'en', label: 'English', short: 'EN' },
            { code: 'fr', label: 'Français', short: 'FR' },
            { code: 'sw', label: 'Kiswahili', short: 'SW' },
            { code: 'ha', label: 'Hausa', short: 'HA' },
            { code: 'yo', label: 'Yorùbá', short: 'YO' },
            { code: 'ig', label: 'Igbo', short: 'IG' },
        ],
        []
    );

    const selected = languages.find((l) => l.code === currentLang) || languages[0];

    useEffect(() => {
        if (!open) return;
        const onMouseDown = (e: MouseEvent) => {
            const el = containerRef.current;
            if (!el) return;
            if (e.target instanceof Node && !el.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [open]);

    const setLanguage = async (code: string) => {
        if (code === currentLang) {
            setOpen(false);
            return;
        }
        setOpen(false);
        authService.updateStoredUser({ language: code } as any);
        await i18n.changeLanguage(code);
        try {
            await userService.updateProfile({ language: code });
        } catch {
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2"
                type="button"
            >
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                    {selected.short}
                </span>
                <span className="text-[10px] text-slate-300 font-medium">
                    {selected.label}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open ? (
                <div className="absolute right-0 mt-2 w-44 bg-slate-900/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            type="button"
                            onClick={() => setLanguage(lang.code)}
                            className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between gap-3 transition-colors ${
                                lang.code === currentLang
                                    ? 'bg-indigo-500/10 text-white'
                                    : 'text-slate-300 hover:bg-white/10'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                                    {lang.short}
                                </span>
                                <span className="text-sm font-semibold">{lang.label}</span>
                            </span>
                            {lang.code === currentLang ? (
                                <span className="text-[10px] font-bold text-emerald-400">●</span>
                            ) : null}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
