import { describe, expect, it } from 'vitest';
import { transitionNameSlug } from './slug';

/**
 * `view-transition-name` must be a valid CSS identifier: a free-form entity
 * name («Proyecto 1», «Mentoría 1:1») would silently break the declaration
 * (issue 47 S11), so the card components slug it first.
 */

describe('transitionNameSlug', () => {
	it.each([
		['Proyecto 1', 'proyecto-1'],
		['Mentoría 1:1', 'mentoria-1-1'],
		['¡Hola, Mundo!', 'hola-mundo'],
		['API', 'api'],
		['  --weird__name--  ', 'weird-name'],
	])('%s → %s', (value, expected) => {
		expect(transitionNameSlug(value)).toBe(expected);
	});

	it('falls back to a stable token when nothing identifier-ish survives', () => {
		expect(transitionNameSlug('!!!')).toBe('item');
	});
});
