import { describe, expect, it } from 'vitest';
import {
	insertLinePrefix,
	replaceRange,
	slashTarget,
	wrapSelection,
} from './selection';

/** Toolbar/slash transforms. All of them mirror what the canvas demo does with
 * `setRangeText`, so the island keeps one tested pure layer and thin glue. */
describe('wrapSelection', () => {
	it('wraps a real selection with the token pair and moves the caret to the end', () => {
		const text = 'ver crítico aquí';
		const result = wrapSelection(text, 4, 11, '**', '**');

		expect(result.text).toBe('ver **crítico** aquí');
		// Caret where `setRangeText(..., 'end')` leaves it: after the wrap.
		expect(result.caretStart).toBe(15);
		expect(result.caretEnd).toBe(15);
	});

	it('inserts a fallback snippet when nothing is selected', () => {
		const result = wrapSelection('escribime ', 10, 10, '<span class="c-aka">', '</span>');

		expect(result.text).toBe('escribime <span class="c-aka">texto</span>');
		expect(result.caretStart).toBe('escribime <span class="c-aka">texto</span>'.length);
	});

	it('wraps the code token pair', () => {
		const result = wrapSelection('run `x`', 5, 6, '`', '`');

		expect(result.text).toBe('run ``x``');
	});
});

describe('insertLinePrefix', () => {
	it('inserts the prefix at the start of the caret line', () => {
		const text = 'párrafo\n\nsegundos';
		const result = insertLinePrefix(text, text.indexOf('segundos'), '## ');

		expect(result.text).toBe('párrafo\n\n## segundos');
	});

	it('inserts at position 0 for a caret on the first line', () => {
		const result = insertLinePrefix('mi título', 3, '## ');

		expect(result.text).toBe('## mi título');
	});
});

describe('slashTarget', () => {
	it('matches a lone slash at the caret line', () => {
		const text = 'linea uno\n/';
		const result = slashTarget(text, text.length);

		expect(result).toEqual({ lineStart: text.indexOf('/') });
	});

	it('rejects a slash with more content before it on the line', () => {
		const text = 'no soy el menu /';
		const result = slashTarget(text, text.length);

		expect(result).toBeNull();
	});

	it('rejects the slash mid-paragraph', () => {
		const text = 'a/b';
		const result = slashTarget(text, 2);

		expect(result).toBeNull();
	});
});

describe('replaceRange', () => {
	it('replaces the slash line with the inserted block', () => {
		const text = 'linea uno\n/';
		const result = replaceRange(text, 10, 11, '> ');

		expect(result.text).toBe('linea uno\n> ');
		expect(result.caretStart).toBe('linea uno\n> '.length);
	});
});
