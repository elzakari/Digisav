import crypto from 'crypto';

export function generateGroupPrefix(groupName: string): string {
  // Extract initials from group name
  const words = groupName.trim().split(/\s+/).filter(w => w.length > 0);
  let prefix = '';

  if (words.length >= 3) {
    // Take first letter of first 3-4 words
    prefix = words.slice(0, 4).map(w => w[0]).join('').toUpperCase();
  } else if (words.length === 2) {
    // Take 2 from first, 1-2 from second
    const first = words[0];
    const second = words[1];
    prefix = (first.substring(0, 2) + second.substring(0, 2)).substring(0, 4).toUpperCase();
  } else if (words.length === 1) {
    // Take first 3-4 chars
    prefix = words[0].substring(0, 4).toUpperCase();
  }

  // Sanitize: remove non-alphanumeric
  prefix = prefix.replace(/[^A-Z0-9]/g, '');

  // fallback to random if prefix is too short
  if (prefix.length < 2) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 4; i++) {
      prefix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    prefix = prefix.substring(0, 4);
  }

  return prefix;
}

export function generateAccountNumber(groupPrefix: string): string {
  // Format: [PREFIX]-[SEQUENCE]-[CHECK]
  // Example: SG001-00234-7

  const sequence = crypto.randomInt(1, 99999).toString().padStart(5, '0');
  const checkDigit = calculateLuhnCheckDigit(groupPrefix + sequence);

  return `${groupPrefix}-${sequence}-${checkDigit}`;
}

function calculateLuhnCheckDigit(input: string): string {
  // Luhn algorithm for checksum
  const digits = input.replace(/\D/g, '');
  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateTransactionReference(paymentMethod: string, operationType: string, dateObj?: Date): string {
  const pInit = paymentMethod ? paymentMethod.charAt(0).toUpperCase() : 'X';
  const oInit = operationType ? operationType.charAt(0).toUpperCase() : 'X';
  
  const d = dateObj ? new Date(dateObj) : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  
  // Series of 5 digit
  const random5 = crypto.randomInt(1, 99999).toString().padStart(5, '0');
  
  // Format: Initial of mode of payment + Initial of operation + date"YY-MM-DD" + series of 5 digit
  return `${pInit}${oInit}${yy}-${mm}-${dd}${random5}`;
}
