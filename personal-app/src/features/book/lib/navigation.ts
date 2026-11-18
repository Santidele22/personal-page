import { displayItemPlainText, type BookDisplayItem } from './displayModel';

export function computeInitialRenderWindow(
	totalItems: number,
	targetIndex: number,
	batchSize = 60,
): { start: number; end: number } {
	if (totalItems <= 0) return { start: 0, end: 0 };
	const safeBatch = Math.max(10, batchSize);
	const clampedTarget = Math.min(totalItems - 1, Math.max(0, targetIndex));
	if (clampedTarget <= safeBatch * 2) {
		return {
			start: 0,
			end: Math.min(totalItems, Math.max(safeBatch, clampedTarget + Math.ceil(safeBatch * 0.6))),
		};
	}
	const start = Math.max(0, clampedTarget - Math.floor(safeBatch * 0.5));
	const end = Math.min(totalItems, clampedTarget + Math.ceil(safeBatch * 0.7));
	return { start, end };
}

export function findSavedProgressItemIndex(
	items: readonly BookDisplayItem[],
	progress?: { chunkId?: string; page?: number } | null,
): number {
	if (items.length === 0 || !progress) return 0;
	if (progress.chunkId) {
		const byChunk = items.findIndex((item) =>
			item.kind === 'toc'
				? item.chunkId === progress.chunkId || item.chunkIds.includes(progress.chunkId!)
				: item.chunkId === progress.chunkId,
		);
		if (byChunk >= 0) return byChunk;
	}
	if (progress.page && progress.page > 1) {
		const byPage = items.findIndex((item) => item.page >= progress.page!);
		if (byPage >= 0) return byPage;
	}
	return 0;
}

function normalizeJumpTargetText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[·]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function findTocJumpTargetIndex(
	items: readonly BookDisplayItem[],
	targetLabel: string,
	targetPage: number,
): number | null {
	if (items.length === 0) return null;
	const cleanTarget = normalizeJumpTargetText(targetLabel);

	if (cleanTarget) {
		const headingMatch = items.findIndex((item) => {
			if (item.kind !== 'heading' && item.kind !== 'opener' && !(item.kind === 'para' && item.chapterMarker)) {
				return false;
			}
			const raw =
				item.kind === 'heading'
					? item.text
					: item.kind === 'opener'
						? item.title
						: item.chapterMarker ?? '';
			const candidate = normalizeJumpTargetText(raw);
			if (!candidate) return false;
			if (candidate === cleanTarget) return true;
			if (cleanTarget.length >= 4 && candidate.length >= 4) {
				return candidate.includes(cleanTarget) || cleanTarget.includes(candidate);
			}
			const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`).test(candidate);
		});
		if (headingMatch >= 0) return headingMatch;

		if (cleanTarget.length >= 4) {
			const paraMatch = items.findIndex((item) => {
				if (item.kind === 'toc' || item.kind === 'opener') return false;
				return normalizeJumpTargetText(displayItemPlainText(item)).startsWith(cleanTarget);
			});
			if (paraMatch >= 0) return paraMatch;
		}
	}

	if (targetPage > 0) {
		const exactPage = items.findIndex((item) => item.kind !== 'toc' && item.page === targetPage);
		if (exactPage >= 0) return exactPage;
		const nextPage = items.findIndex((item) => item.kind !== 'toc' && item.page >= targetPage);
		if (nextPage >= 0) return nextPage;
		for (let i = items.length - 1; i >= 0; i -= 1) {
			if (items[i].kind !== 'toc') return i;
		}
	}

	return null;
}

export function findKeywordJumpTargetIndex(
	items: readonly BookDisplayItem[],
	term: string,
	anchor?: string,
): number | null {
	if (items.length === 0) return null;
	if (anchor) {
		const byAnchor = items.findIndex((item) =>
			item.kind === 'toc'
				? item.chunkId === anchor || item.chunkIds.includes(anchor)
				: item.chunkId === anchor,
		);
		if (byAnchor >= 0) return byAnchor;
	}
	const cleanTerm = term.trim().toLowerCase();
	if (!cleanTerm) return null;
	const byText = items.findIndex((item) => {
		if (item.kind === 'toc') {
			return item.parsed.entries.some((e) => e.label.toLowerCase().includes(cleanTerm));
		}
		if (item.kind === 'opener') {
			return item.title.toLowerCase().includes(cleanTerm);
		}
		return displayItemPlainText(item).toLowerCase().includes(cleanTerm);
	});
	return byText >= 0 ? byText : null;
}

export type ChapterNavItem = {
	id: string;
	itemIndex: number;
	title: string;
	page: number;
	level: 1 | 2 | 3;
};

function formatChapterMarkerTitle(marker: string, bodyText: string): string {
	const cleanMarker = marker.replace(/\s+/g, ' ').trim();
	const cleanBody = bodyText.replace(/\s+/g, ' ').trim();
	if (!cleanBody || cleanMarker.length > 6) {
		return cleanMarker;
	}
	const maxLen = 44;
	if (cleanBody.length <= maxLen) {
		return `${cleanMarker} · ${cleanBody}`;
	}
	const truncated = cleanBody.slice(0, maxLen).replace(/\s+\S*$/, '').trim() || cleanBody.slice(0, maxLen).trim();
	return `${cleanMarker} · ${truncated}…`;
}

export function extractBookChapters(items: readonly BookDisplayItem[]): ChapterNavItem[] {
	if (items.length === 0) return [];

	const primary: ChapterNavItem[] = [];
	const level2: ChapterNavItem[] = [];
	const level3: ChapterNavItem[] = [];

	for (let i = 0; i < items.length; i += 1) {
		const item = items[i];
		if (item.kind === 'heading') {
			const entry: ChapterNavItem = {
				id: item.chunkId,
				itemIndex: i,
				title: item.text.trim(),
				page: item.page,
				level: item.level,
			};
			if (item.level === 1) primary.push(entry);
			else if (item.level === 2) level2.push(entry);
			else level3.push(entry);
		} else if (item.kind === 'para' && item.chapterMarker) {
			primary.push({
				id: item.chunkId,
				itemIndex: i,
				title: formatChapterMarkerTitle(item.chapterMarker, item.text),
				page: item.page,
				level: 1,
			});
		}
	}

	if (primary.length > 0) return primary;
	if (level2.length > 0) return level2;
	if (level3.length > 0) return level3;

	const tocChapters: ChapterNavItem[] = [];
	const seenIndices = new Set<number>();
	const tocItems = items.filter((item): item is Extract<BookDisplayItem, { kind: 'toc' }> => item.kind === 'toc');
	const hasTopLevelToc = tocItems.some((toc) =>
		toc.parsed.entries.some((entry) => (entry.level ?? 1) === 1),
	);

	for (const toc of tocItems) {
		for (const entry of toc.parsed.entries) {
			const entryLevel = entry.level ?? 1;
			if (hasTopLevelToc && entryLevel !== 1) continue;
			const targetIdx = findTocJumpTargetIndex(items, entry.label, entry.page);
			if (targetIdx === null || seenIndices.has(targetIdx)) continue;
			seenIndices.add(targetIdx);
			const targetItem = items[targetIdx];
			tocChapters.push({
				id: targetItem.chunkId,
				itemIndex: targetIdx,
				title: entry.label,
				page: entry.page || targetItem.page,
				level: entryLevel,
			});
		}
	}

	return tocChapters;
}

export function findActiveChapterIndex(
	chapters: readonly ChapterNavItem[],
	currentItemIndex: number,
): number {
	if (chapters.length === 0 || !Number.isFinite(currentItemIndex)) return -1;
	let active = -1;
	for (let i = 0; i < chapters.length; i += 1) {
		if (chapters[i].itemIndex <= currentItemIndex) {
			active = i;
		} else {
			break;
		}
	}
	return active;
}

export function findAdjacentChapterIndex(
	chapters: readonly ChapterNavItem[],
	currentItemIndex: number,
	direction: 1 | -1,
): number | null {
	if (chapters.length === 0) return null;
	const active = findActiveChapterIndex(chapters, currentItemIndex);
	if (direction > 0) {
		if (active < 0) return 0;
		return active + 1 < chapters.length ? active + 1 : null;
	}
	if (active < 0) return null;
	if (active > 0) return active - 1;
	return currentItemIndex > chapters[0].itemIndex ? 0 : null;
}
