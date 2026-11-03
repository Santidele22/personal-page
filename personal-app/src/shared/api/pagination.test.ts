import { describe, expect, it } from 'vitest';
import { offsetForPage, pageQuery, paginationWindow, parseOffset } from './pagination';

/**
 * Offset/limit helpers the dedicated archive pages drive their controls with
 * (issue 47 S9). The backend clamps the window again, so the helpers only
 * guarantee a sane, deterministic URL — never a trusted input.
 */

describe('pageQuery', () => {
	it('builds the offset/limit query string', () => {
		expect(pageQuery(9, 4)).toBe('?offset=9&limit=4');
		expect(pageQuery(undefined, 4)).toBe('?limit=4');
		expect(pageQuery(0, undefined)).toBe('?offset=0');
	});
});

describe('parseOffset', () => {
	it.each([
		[null, 0],
		['', 0],
		['abc', 0],
		['-3', 0],
		['2.5', 0],
		['0', 0],
		['9', 9],
	])('%s → %i', (raw, expected) => {
		expect(parseOffset(raw)).toBe(expected);
	});
});

describe('paginationWindow', () => {
	it('is empty when the collection fits one page', () => {
		expect(paginationWindow(4, 0, 4)).toEqual([]);
		expect(paginationWindow(0, 0, 4)).toEqual([]);
	});

	it('marks the current page inside a full window', () => {
		const window = paginationWindow(70, 20, 10);
		expect(window).toHaveLength(7);
		expect(window[2]).toEqual({ number: 3, current: true });
		expect(window.filter((page) => page.current)).toHaveLength(1);
	});

	it('anchors the window at the edges instead of leaving it', () => {
		const first = paginationWindow(100, 0, 10);
		expect(first.map((page) => page.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(first[0].current).toBe(true);

		const last = paginationWindow(100, 90, 10);
		expect(last.map((page) => page.number)).toEqual([4, 5, 6, 7, 8, 9, 10]);
		expect(last.at(-1)?.current).toBe(true);
	});

	it('clamps the current page to the last one for out-of-range offsets', () => {
		const window = paginationWindow(25, 900, 10);
		expect(window.at(-1)).toEqual({ number: 3, current: true });
	});
});

describe('offsetForPage', () => {
	it('maps the 1-based page to its offset', () => {
		expect(offsetForPage(1, 10)).toBe(0);
		expect(offsetForPage(3, 10)).toBe(20);
	});
});
