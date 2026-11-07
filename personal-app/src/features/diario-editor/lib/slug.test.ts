import { describe, expect, it } from 'vitest';
import { slugPreviewPath, titleSlug } from './slug';

/**
 * Mirrors the backend `slugify` (`backend/src/blogs/blogs.service.ts`) so the
 * drawer preview shows the exact URL the create call will store.
 */
describe('titleSlug', () => {
	it('folds accents and keeps the word shape', () => {
		expect(titleSlug('Tokenización de activos: lo que aprendí')).toBe(
			'tokenizacion-de-activos-lo-que-aprendi'
		);
	});

	it('collapses punctuation to single dashes', () => {
		expect(titleSlug('Guía — rápida, para empezar')).toBe('guia-rapida-para-empezar');
	});

	it('falls back to "entrada" for a title without sluggable characters', () => {
		expect(titleSlug('???')).toBe('entrada');
	});
});

describe('slugPreviewPath', () => {
	it('composes the public path', () => {
		expect(slugPreviewPath('Mi entrada')).toBe('/blog/mi-entrada');
	});

	it('shows an ellipsis placeholder while the title is empty', () => {
		expect(slugPreviewPath('')).toBe('/blog/…');
	});
});
