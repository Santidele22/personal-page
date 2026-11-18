import { describe, expect, it } from 'vitest';

import {
	removeMarkFromState,
	removeWordFromState,
	resolveAutoBookStatus,
	resolvePreferredReadingState,
} from './state';

describe('reading state helpers', () => {
	it('removes an underline mark by id or fallback anchor/text', () => {
		const marks = [
			{ id: 'm-1', kind: 'underline' as const, ink: 'aka' as const, anchor: 'p0001.0000+[0,13]', text: 'modificaciones' },
			{ id: 'm-2', kind: 'underline' as const, ink: 'bronce' as const, anchor: 'p0002.0010+[0,5]', text: 'teoría' },
		];

		expect(removeMarkFromState(marks, { id: 'm-1' })).toEqual([marks[1]]);
		expect(
			removeMarkFromState(marks, { chunkId: 'p0002.0010', text: 'teoría' }),
		).toEqual([marks[0]]);
	});

	it('removes a keyword by term and optional anchor', () => {
		const words = [
			{ term: 'teoría', anchor: 'p0002.0010' },
			{ term: 'Naur', anchor: 'p0001.0000' },
		];

		expect(removeWordFromState(words, { term: 'teoría', anchor: 'p0002.0010' })).toEqual([
			words[1],
		]);
	});

	it('respects intentional local mark deletions over stale server state when local is newer', () => {
		const server = {
			bookId: '1',
			marks: [{ id: 'm-1', kind: 'underline' as const, ink: 'aka' as const, anchor: 'p0001.0000+[0,5]', text: 'Naur' }],
			words: [],
			progress: { page: 3, pct: 13 },
		};
		const localRaw = JSON.stringify({
			bookId: '1',
			marks: [],
			words: [],
			progress: { page: 3, pct: 13 },
			updatedAt: Date.now(),
		});

		const merged = resolvePreferredReadingState(server, localRaw);
		expect(merged.marks).toEqual([]);
	});
});

describe('automatic reading status transitions', () => {
	it('promotes queued to reading when starting and promotes to finished at 100%', () => {
		expect(resolveAutoBookStatus('queued', 0, false)).toBeNull();
		expect(resolveAutoBookStatus('queued', 0, true)).toBe('reading');
		expect(resolveAutoBookStatus('queued', 12, true)).toBe('reading');
		expect(resolveAutoBookStatus('queued', 100, true)).toBe('finished');
		expect(resolveAutoBookStatus('reading', 100, true)).toBe('finished');
		expect(resolveAutoBookStatus('reading', 55, true)).toBeNull();
		expect(resolveAutoBookStatus('finished', 25, true)).toBeNull();
		expect(resolveAutoBookStatus('finished', 100, true)).toBeNull();
	});
});
