import type { ReadingChunk } from '../../../entities/book/types';

import type { BookDisplayItem } from './displayModel';
import { headingLevelFromText } from './headings';
import type { ParsedToc } from './toc';

export type TocQueueState = {
	pendingTocHeading?: { text: string; chunkId: string; page: number };
};

export function flushPendingTocHeading(items: BookDisplayItem[], state: TocQueueState): void {
	const pending = state.pendingTocHeading;
	if (!pending) return;
	items.push({
		kind: 'heading',
		chunkId: pending.chunkId,
		page: pending.page,
		text: pending.text,
		level: headingLevelFromText(pending.text),
	});
	state.pendingTocHeading = undefined;
}

export function pushMetaItem(items: BookDisplayItem[], chunk: ReadingChunk): void {
	const prev = items[items.length - 1];
	if (prev && prev.kind === 'meta' && prev.page === chunk.page) {
		prev.text = `${prev.text}\n${chunk.text}`;
		return;
	}
	items.push({ kind: 'meta', chunkId: chunk.id, page: chunk.page, text: chunk.text });
}

export function pushTocItem(
	items: BookDisplayItem[],
	chunk: ReadingChunk,
	parsed: ParsedToc,
	state: TocQueueState,
): void {
	const pending = state.pendingTocHeading;
	if (pending) {
		if (!parsed.heading) parsed.heading = pending.text;
		state.pendingTocHeading = undefined;
	}
	const prev = items[items.length - 1];
	if (prev && prev.kind === 'toc') {
		prev.chunkIds.push(chunk.id);
		if (!prev.parsed.heading && parsed.heading) {
			prev.parsed.heading = parsed.heading;
		}
		for (const entry of parsed.entries) {
			const lastEntry = prev.parsed.entries[prev.parsed.entries.length - 1];
			if (
				lastEntry &&
				lastEntry.label === entry.label &&
				lastEntry.page === entry.page &&
				lastEntry.pageLabel === entry.pageLabel
			) {
				continue;
			}
			prev.parsed.entries.push(entry);
		}
		return;
	}
	items.push({
		kind: 'toc',
		chunkId: chunk.id,
		chunkIds: [chunk.id],
		page: chunk.page,
		parsed: {
			heading: parsed.heading,
			entries: [...parsed.entries],
		},
	});
}
