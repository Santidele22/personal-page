import { describe, expect, it } from 'vitest';

import { formatAdminError, formatAdminRowCount, isHttpUrl, parseNonNegativeInt } from './adminPanel';

describe('formatAdminError', () => {
	it('appends a trimmed Error message to the fallback copy', () => {
		expect(formatAdminError('No pudimos guardar los cambios.', new Error('  Bad Request  '))).toBe(
			'No pudimos guardar los cambios. (Bad Request)',
		);
	});

	it('returns the fallback alone when the error has no message or is not an Error', () => {
		expect(formatAdminError('No pudimos guardar.', new Error('   '))).toBe('No pudimos guardar.');
		expect(formatAdminError('No pudimos guardar.', 'boom')).toBe('No pudimos guardar.');
		expect(formatAdminError('No pudimos guardar.', null)).toBe('No pudimos guardar.');
	});
});

describe('isHttpUrl', () => {
	it('accepts full http and https URLs without whitespace', () => {
		expect(isHttpUrl('https://www.linkedin.com/in/santiago')).toBe(true);
		expect(isHttpUrl('http://localhost:4321/test')).toBe(true);
		expect(isHttpUrl('HTTPS://EXAMPLE.COM')).toBe(true);
	});

	it('rejects empty strings, bare hosts, other schemes, and strings with spaces', () => {
		expect(isHttpUrl('')).toBe(false);
		expect(isHttpUrl('linkedin.com/in/santiago')).toBe(false);
		expect(isHttpUrl('ftp://example.com/file')).toBe(false);
		expect(isHttpUrl('javascript:alert(1)')).toBe(false);
		expect(isHttpUrl('https://example.com/with space')).toBe(false);
	});
});

describe('parseNonNegativeInt', () => {
	it('returns null for empty or whitespace-only input', () => {
		expect(parseNonNegativeInt('')).toBeNull();
		expect(parseNonNegativeInt('   ')).toBeNull();
	});

	it('parses zero and positive integers', () => {
		expect(parseNonNegativeInt('0')).toBe(0);
		expect(parseNonNegativeInt(' 12 ')).toBe(12);
	});

	it('returns invalid for negatives, floats, and non-numeric strings', () => {
		expect(parseNonNegativeInt('-1')).toBe('invalid');
		expect(parseNonNegativeInt('1.5')).toBe('invalid');
		expect(parseNonNegativeInt('abc')).toBe('invalid');
		expect(parseNonNegativeInt('Infinity')).toBe('invalid');
		expect(parseNonNegativeInt('NaN')).toBe('invalid');
	});
});

describe('formatAdminRowCount', () => {
	it('uses singular for count 1 and plural for 0 or more than 1', () => {
		expect(formatAdminRowCount(0, 'recomendación', 'recomendaciones')).toBe('0 recomendaciones');
		expect(formatAdminRowCount(1, 'recomendación', 'recomendaciones')).toBe('1 recomendación');
		expect(formatAdminRowCount(3, 'recomendación', 'recomendaciones')).toBe('3 recomendaciones');
	});

	it('appends the optional note separated by a middle dot when non-empty', () => {
		expect(formatAdminRowCount(2, 'recomendación', 'recomendaciones', 'en orden de posición')).toBe(
			'2 recomendaciones · en orden de posición',
		);
		expect(formatAdminRowCount(1, 'enlace', 'enlaces', '  ')).toBe('1 enlace');
	});
});
