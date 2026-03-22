import { authService } from '@/services/auth.service';

/**
 * Formats a number as a currency string based on the user's preferred currency or a specific override.
 * @param amount - The numerical amount to format.
 * @param fixedDecimals - Number of decimal places (default is 0).
 * @param currencyOverride - Optional currency code to override the user's default (e.g., "USD", "KES").
 * @returns A formatted currency string.
 */
export const formatCurrency = (amount: number, fixedDecimals: number = 0, currencyOverride?: string): string => {
  const user = authService.getCurrentUser();
  const currencyCode = currencyOverride || user?.defaultCurrency || 'KES';

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'code',
      minimumFractionDigits: fixedDecimals,
      maximumFractionDigits: fixedDecimals,
    }).format(amount);
  } catch {
    const formattedAmount = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: fixedDecimals,
      maximumFractionDigits: fixedDecimals,
    }).format(amount);
    return `${currencyCode} ${formattedAmount}`;
  }
};

/**
 * Returns the current user's preferred currency code.
 */
export const getCurrencyCode = (): string => {
  const user = authService.getCurrentUser();
  return user?.defaultCurrency || 'KES';
};
