import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/user.service';
import { authService } from '../../services/auth.service';
import { toast } from 'react-hot-toast';
import { COUNTRIES, getCountryOption } from '@/constants/countries';

export function SettingsPage() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['user-profile'],
        queryFn: () => userService.getProfile(),
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (settings: any) => userService.updateProfile(settings),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            authService.updateStoredUser(data);
            toast.success(t('settings.updated_success') || 'Profile updated successfully');
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.error?.message || error?.response?.data?.message || 'Failed to update profile';
            toast.error(msg);
        }
    });

    const [language, setLanguage] = useState(profile?.language || 'en');
    const [theme, setTheme] = useState(profile?.theme || 'dark');
    const [currency, setCurrency] = useState(profile?.defaultCurrency || 'KES');
    const [countryCode, setCountryCode] = useState(profile?.countryCode || '');
    
    // Account details state
    const [fullName, setFullName] = useState(profile?.fullName || '');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');

    useEffect(() => {
        if (profile) {
            setLanguage(profile.language);
            setTheme(profile.theme);
            setCurrency(profile.defaultCurrency);
            setCountryCode(profile.countryCode || '');
            setFullName(profile.fullName || '');
            setPhoneNumber(profile.phoneNumber || '');
            
            // Sync UI state with profile preferences
            if (i18n.language !== profile.language) {
                i18n.changeLanguage(profile.language);
            }
            if (document.documentElement.getAttribute('data-theme') !== profile.theme) {
                document.documentElement.setAttribute('data-theme', profile.theme);
            }
        }
    }, [profile, i18n]);

    const handleAccountUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateSettingsMutation.mutate({ fullName, phoneNumber });
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        i18n.changeLanguage(newLang);
        updateSettingsMutation.mutate({ language: newLang });
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const next = e.target.value;
        setCountryCode(next);

        const opt = getCountryOption(next);
        const nextLang = opt?.language || 'en';
        const nextCurrency = opt?.currencyCode || 'KES';

        setLanguage(nextLang);
        setCurrency(nextCurrency);
        i18n.changeLanguage(nextLang);

        updateSettingsMutation.mutate({
            countryCode: next,
            language: nextLang,
            defaultCurrency: nextCurrency,
        });
    };

    const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTheme = e.target.value;
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        updateSettingsMutation.mutate({ theme: newTheme });
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = e.target.value;
        setCurrency(newCurrency);
        updateSettingsMutation.mutate({ defaultCurrency: newCurrency });
    };

    if (isLoading) return <div className="p-8 animate-pulse text-slate-400">Loading settings...</div>;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-10 animate-fade-in-up py-10">
            <header className="space-y-1">
                <h1 className="text-4xl font-black tracking-tight text-white uppercase">{t('settings.title')}</h1>
                <p className="text-slate-400">{t('settings.subtitle')}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Account Details */}
                <section className="glass-card p-8 space-y-8 md:col-span-2">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">{String(t('settings.account_details', { defaultValue: 'Account Details' } as any))}</h2>
                    </div>

                    <form onSubmit={handleAccountUpdate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">{String(t('common.full_name', { defaultValue: 'Full Name' } as any))}</label>
                                <input 
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full glass-input bg-[#1e1b4b]"
                                    required
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">{String(t('common.phone_number', { defaultValue: 'Phone Number' } as any))}</label>
                                <input 
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full glass-input bg-[#1e1b4b]"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">{String(t('common.email', { defaultValue: 'Email Address' } as any))}</label>
                                <input 
                                    type="email"
                                    value={profile?.email || ''}
                                    className="w-full glass-input bg-white/5 text-slate-500 cursor-not-allowed"
                                    disabled
                                    title="Email cannot be changed directly"
                                />
                                <p className="text-[10px] text-slate-500 mt-1 ml-1">* Email address is used for login and cannot be changed here.</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button 
                                type="submit" 
                                disabled={updateSettingsMutation.isPending}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                                {updateSettingsMutation.isPending ? String(t('common.saving', { defaultValue: 'Saving...' } as any)) : String(t('common.save_changes', { defaultValue: 'Save Changes' } as any))}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Visual Settings */}
                <section className="glass-card p-8 space-y-8">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-3" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">{t('settings.appearance')}</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">
                                {String(t('settings.country', { defaultValue: 'Country' } as any))}
                            </label>
                            <select
                                value={countryCode}
                                onChange={handleCountryChange}
                                className="w-full glass-input bg-[#1e1b4b] appearance-none"
                            >
                                <option value="" disabled>
                                    {String(t('settings.select_country', { defaultValue: 'Select country' } as any))}
                                </option>
                                {COUNTRIES.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-500 mt-2 italic">
                                * {String(t('settings.country_affects_defaults', { defaultValue: 'Changing country updates default language and currency.' } as any))}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">{t('settings.theme')}</label>
                            <select 
                                value={theme} 
                                onChange={handleThemeChange}
                                className="w-full glass-input bg-[#1e1b4b] appearance-none"
                            >
                                <option value="dark">Dark Aura</option>
                                <option value="light">Pure Light</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">{t('settings.language')}</label>
                            <select 
                                value={language} 
                                onChange={handleLanguageChange}
                                className="w-full glass-input bg-[#1e1b4b] appearance-none"
                            >
                                <option value="en">English (US)</option>
                                <option value="fr">Français (France)</option>
                                <option value="sw">Kiswahili (East Africa)</option>
                                <option value="ha">Hausa (West Africa)</option>
                                <option value="yo">Yoruba (West Africa)</option>
                                <option value="ig">Igbo (West Africa)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Financial Settings */}
                <section className="glass-card p-8 space-y-8">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">{t('settings.financial_preferences')}</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">{t('settings.default_currency')}</label>
                            <select 
                                value={currency} 
                                onChange={handleCurrencyChange}
                                className="w-full glass-input bg-[#1e1b4b] appearance-none"
                            >
                                <option value="KES">Kenyan Shilling (KES)</option>
                                <option value="USD">US Dollar (USD)</option>
                                <option value="EUR">Euro (EUR)</option>
                                <option value="TZS">Tanzanian Shilling (TZS)</option>
                                <option value="UGX">Ugandan Shilling (UGX)</option>
                                <option value="NGN">Nigerian Naira (NGN)</option>
                                <option value="XOF">CFA Franc (XOF)</option>
                                <option value="GHS">Ghanaian Cedi (GHS)</option>
                            </select>
                            <p className="text-[10px] text-slate-500 mt-2 italic">* {t('settings.currency_note')}</p>
                        </div>
                    </div>
                </section>
            </div>

            <div className="glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-indigo-500/20">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-indigo-300">{t('settings.data_persistence')}</h3>
                    <p className="text-sm text-slate-400">{t('settings.data_persistence_desc')}</p>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 21.5c-4.632-1.28-7-6.28-7-9.5V6.75l7-2.5 7 2.5V12c0 3.22-2.368 8.22-7 9.5z" /></svg>
                    {t('settings.encrypted_sync')}
                </div>
            </div>
        </div>
    );
}
