export type SupportedLanguage = 'en' | 'fr' | 'sw' | 'ha' | 'yo' | 'ig';

export type CountryOption = {
  code: string;
  name: string;
  currencyCode: string;
  language: SupportedLanguage;
  kycLabel?: string;
  kycHint?: string;
};

export const COUNTRIES: CountryOption[] = [
  { code: 'GH', name: 'Ghana', currencyCode: 'GHS', language: 'en', kycLabel: 'Ghana Card', kycHint: 'e.g. GHA-123456789-0' },
  { code: 'NG', name: 'Nigeria', currencyCode: 'NGN', language: 'en', kycLabel: 'NIN', kycHint: '11 digits' },
  { code: 'KE', name: 'Kenya', currencyCode: 'KES', language: 'sw', kycLabel: 'National ID', kycHint: '8 digits' },
  { code: 'TZ', name: 'Tanzania', currencyCode: 'TZS', language: 'sw', kycLabel: 'National ID', kycHint: 'digits' },
  { code: 'UG', name: 'Uganda', currencyCode: 'UGX', language: 'en', kycLabel: 'National ID', kycHint: 'alphanumeric' },
  { code: 'SN', name: 'Senegal', currencyCode: 'XOF', language: 'fr', kycLabel: 'National ID', kycHint: 'digits' },
  { code: 'CI', name: "Côte d’Ivoire", currencyCode: 'XOF', language: 'fr', kycLabel: 'National ID', kycHint: 'alphanumeric' },
  { code: 'BF', name: 'Burkina Faso', currencyCode: 'XOF', language: 'fr', kycLabel: 'National ID', kycHint: 'alphanumeric' },
  { code: 'ML', name: 'Mali', currencyCode: 'XOF', language: 'fr', kycLabel: 'National ID', kycHint: 'alphanumeric' },
  { code: 'BJ', name: 'Benin', currencyCode: 'XOF', language: 'fr', kycLabel: 'National ID', kycHint: 'alphanumeric' },
  { code: 'TG', name: 'Togo', currencyCode: 'XOF', language: 'fr', kycLabel: 'National ID', kycHint: 'alphanumeric' },
];

export const getCountryOption = (code?: string | null) => {
  const normalized = (code || '').trim().toUpperCase();
  return COUNTRIES.find((c) => c.code === normalized) || null;
};

