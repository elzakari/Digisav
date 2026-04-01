import { normalizeCountry } from '@/utils/countryDefaults';

export const isValidNationalId = (countryCode: string | null | undefined, value: string) => {
  const v = (value || '').trim().replace(/\s+/g, '');
  if (!v) return false;

  const cc = normalizeCountry(countryCode);

  if (cc === 'NG') return /^\d{11}$/.test(v);
  if (cc === 'KE') return /^\d{8}$/.test(v);
  if (cc === 'GH') return /^GHA-\d{9}-\d$/i.test(v) || /^\d{10,15}$/.test(v);

  return /^[A-Za-z0-9-]{5,30}$/.test(v);
};

