export type SupportedLanguage = 'en' | 'fr' | 'sw' | 'ha' | 'yo' | 'ig';

export type CountryDefaults = {
  countryCode: string;
  currencyCode: string;
  language: SupportedLanguage;
};

const normalizeCountryCode = (countryCode?: string | null) => {
  const trimmed = (countryCode || '').trim().toUpperCase();
  if (!trimmed) return null;
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : null;
};

const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  GH: { countryCode: 'GH', currencyCode: 'GHS', language: 'en' },
  NG: { countryCode: 'NG', currencyCode: 'NGN', language: 'en' },
  KE: { countryCode: 'KE', currencyCode: 'KES', language: 'sw' },
  TZ: { countryCode: 'TZ', currencyCode: 'TZS', language: 'sw' },
  UG: { countryCode: 'UG', currencyCode: 'UGX', language: 'en' },
  SN: { countryCode: 'SN', currencyCode: 'XOF', language: 'fr' },
  CI: { countryCode: 'CI', currencyCode: 'XOF', language: 'fr' },
  BF: { countryCode: 'BF', currencyCode: 'XOF', language: 'fr' },
  ML: { countryCode: 'ML', currencyCode: 'XOF', language: 'fr' },
  BJ: { countryCode: 'BJ', currencyCode: 'XOF', language: 'fr' },
  TG: { countryCode: 'TG', currencyCode: 'XOF', language: 'fr' },
};

export const getDefaultsForCountry = (countryCode?: string | null): CountryDefaults | null => {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return null;
  return COUNTRY_DEFAULTS[normalized] || null;
};

export const normalizeCountry = (countryCode?: string | null) => normalizeCountryCode(countryCode);

