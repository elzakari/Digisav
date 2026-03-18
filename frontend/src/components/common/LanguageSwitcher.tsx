import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'fr' : 'en';
        i18n.changeLanguage(nextLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2 group"
            title={i18n.language === 'en' ? 'Switch to French' : 'Passer à l\'Anglais'}
        >
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                {i18n.language === 'en' ? 'FR' : 'EN'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium group-hover:text-slate-300">
                {i18n.language === 'en' ? 'Français' : 'English'}
            </span>
        </button>
    );
}
