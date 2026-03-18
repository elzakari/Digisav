import Levenshtein from 'fast-levenshtein';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarityScore: number;
  matchedField: string;
}

export function checkDuplicate(
  existingData: any[],
  newData: any,
  fields: string[]
): DuplicateCheckResult | null {
  for (const existing of existingData) {
    for (const field of fields) {
      const existingValue = existing[field]?.toString().toLowerCase() || '';
      const newValue = newData[field]?.toString().toLowerCase() || '';

      // Exact match
      if (existingValue === newValue) {
        return {
          isDuplicate: true,
          similarityScore: 1.0,
          matchedField: field,
        };
      }

      // Fuzzy match for names (>85% similarity)
      if (field === 'fullName' || field.includes('name')) {
        const distance = Levenshtein.get(existingValue, newValue);
        const maxLength = Math.max(existingValue.length, newValue.length);
        const similarity = 1 - distance / maxLength;

        if (similarity > 0.85) {
          return {
            isDuplicate: false, // Warning, not blocking
            similarityScore: similarity,
            matchedField: field,
          };
        }
      }
    }
  }

  return null;
}
