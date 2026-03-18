import crypto from 'crypto';

/**
 * Creates a canonical JSON string from an object by sorting keys recursively.
 * This ensures that the same object always produces the same string representation.
 */
export function stringifyCanonical(obj: any): string {
    if (typeof obj !== 'object' || obj === null) {
        return JSON.stringify(obj);
    }
    if (obj instanceof Date) {
        return `"${obj.toISOString()}"`;
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(item => stringifyCanonical(item)).join(',') + ']';
    }
    const sortedKeys = Object.keys(obj).sort();
    return '{' + sortedKeys.map(key => `"${key}":${stringifyCanonical(obj[key])}`).join(',') + '}';
}

/**
 * Generates a SHA-256 hash from a canonical string representation of the data.
 */
export function generateHash(data: any): string {
    const content = stringifyCanonical(data);
    return crypto.createHash('sha256').update(content).digest('hex');
}
