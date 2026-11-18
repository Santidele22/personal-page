import type { ReadingMood } from '../../entities/book/types';
import type { BookDisplayItem } from '../../features/book/lib/reader';
import { computeInitialRenderWindow } from '../../features/book/lib/reader';
import { setCurrentItemIndex } from './chapterNav';
import { BATCH_SIZE, getDisplayItems, getTotalParas } from './doc';
import { readerArticle, stage } from './dom';
import { applyTargetMood } from './feedback';
import { updateFovealGeometry } from './prefs';
import { updateProgressDisplay } from './progress';
import { buildDisplayItemFragment } from './renderItems';
import { refreshLineBlocks, scrollElementToFocalBand, shiftScrollAnchors } from './scroll';
import { getPdfPages } from './state';

// The mounted window of display items, its scroll sentinels and the batching
// that grows the window as the reader approaches either edge.
let renderedStart = 0;
let renderedEnd = 0;
let topSentinel: HTMLDivElement | null = null;
let bottomSentinel: HTMLDivElement | null = null;
let sentinelObserver: IntersectionObserver | null = null;
let isBatchMutating = false;
const io = new IntersectionObserver(
	(entries) => {
		entries.forEach((e) => {
			const target = e.target as HTMLElement;
			target.classList.toggle('reading', e.isIntersecting);
			if (e.isIntersecting) {
				if (target.dataset.itemIndex !== undefined) {
					setCurrentItemIndex(Number(target.dataset.itemIndex));
				}
				if (target.dataset.paraIndex === undefined) {
					return;
				}
				const paraIdx = Number(target.dataset.paraIndex ?? -1);
				const page = Number(target.dataset.page || 1);
				const pct =
					getTotalParas() > 0 && paraIdx >= 0
						? Math.round(((paraIdx + 1) / getTotalParas()) * 100)
						: Math.round((page / getPdfPages()) * 100);
				updateProgressDisplay(page, pct, target.dataset.chunkId);

				const targetMood = (target.dataset.mood as ReadingMood) || 'espera';
				applyTargetMood(targetMood);
			}
		});
	},
	{ rootMargin: '-20% 0px -52% 0px', threshold: 0 },
);

function updateSentinelVisibility() {
	if (topSentinel) topSentinel.hidden = renderedStart <= 0;
	if (bottomSentinel) bottomSentinel.hidden = renderedEnd >= getDisplayItems().length;
}

function appendNextBatch(count = BATCH_SIZE): boolean {
	if (isBatchMutating || !bottomSentinel || renderedEnd >= getDisplayItems().length) {
		return false;
	}
	isBatchMutating = true;
	try {
		const nextEnd = Math.min(getDisplayItems().length, renderedEnd + Math.max(1, count));
		const frag = document.createDocumentFragment();
		for (let i = renderedEnd; i < nextEnd; i += 1) {
			frag.appendChild(buildDisplayItemFragment(getDisplayItems()[i], i));
		}
		readerArticle?.insertBefore(frag, bottomSentinel);
		renderedEnd = nextEnd;
		updateSentinelVisibility();
		refreshLineBlocks();
		return true;
	} finally {
		isBatchMutating = false;
	}
}

function prependPrevBatch(count = BATCH_SIZE): boolean {
	if (isBatchMutating || !topSentinel || !stage || renderedStart <= 0) {
		return false;
	}
	isBatchMutating = true;
	try {
		const nextStart = Math.max(0, renderedStart - Math.max(1, count));
		const prevScrollHeight = stage.scrollHeight;
		const prevScrollTop = stage.scrollTop;

		const frag = document.createDocumentFragment();
		for (let i = nextStart; i < renderedStart; i += 1) {
			frag.appendChild(buildDisplayItemFragment(getDisplayItems()[i], i));
		}
		readerArticle?.insertBefore(frag, topSentinel.nextSibling);
		renderedStart = nextStart;
		updateSentinelVisibility();
		refreshLineBlocks();

		const heightDelta = stage.scrollHeight - prevScrollHeight;
		if (heightDelta > 0) {
			stage.scrollTop = prevScrollTop + heightDelta;
			shiftScrollAnchors(heightDelta);
		}
		return true;
	} finally {
		isBatchMutating = false;
	}
}

function mountRenderWindow(start: number, end: number) {
	if (!readerArticle) return;
	io.disconnect();
	sentinelObserver?.disconnect();
	readerArticle.replaceChildren();

	topSentinel = document.createElement('div');
	topSentinel.className = 'scroll-sentinel';
	topSentinel.id = 'topSentinel';
	topSentinel.setAttribute('aria-hidden', 'true');

	bottomSentinel = document.createElement('div');
	bottomSentinel.className = 'scroll-sentinel';
	bottomSentinel.id = 'bottomSentinel';
	bottomSentinel.setAttribute('aria-hidden', 'true');

	const frag = document.createDocumentFragment();
	for (let i = start; i < end; i += 1) {
		frag.appendChild(buildDisplayItemFragment(getDisplayItems()[i], i));
	}
	readerArticle.appendChild(topSentinel);
	readerArticle.appendChild(frag);
	readerArticle.appendChild(bottomSentinel);
	renderedStart = start;
	renderedEnd = end;
	updateSentinelVisibility();
	refreshLineBlocks();
	updateFovealGeometry();

	if (stage) {
		sentinelObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					if (entry.target === bottomSentinel) {
						appendNextBatch();
					} else if (entry.target === topSentinel) {
						prependPrevBatch();
					}
				}
			},
			{ root: stage, rootMargin: '900px 0px', threshold: 0 },
		);
		sentinelObserver.observe(topSentinel);
		sentinelObserver.observe(bottomSentinel);
	}
}

function findRenderedElementForItem(item: BookDisplayItem): HTMLElement | null {
	if (!readerArticle) return null;
	return readerArticle.querySelector<HTMLElement>(
		`[data-chunk-id="${CSS.escape(item.chunkId)}"]`,
	);
}

function ensureItemRenderedAndScroll(
	targetIdx: number,
	behavior: ScrollBehavior = 'smooth',
): HTMLElement | null {
	if (targetIdx < 0 || targetIdx >= getDisplayItems().length) return null;
	const targetItem = getDisplayItems()[targetIdx];

	if (targetIdx >= renderedStart && targetIdx < renderedEnd) {
		const el = findRenderedElementForItem(targetItem);
		if (el) scrollElementToFocalBand(el, behavior);
		return el;
	}

	if (targetIdx >= renderedEnd && targetIdx - renderedEnd <= 120) {
		appendNextBatch(targetIdx - renderedEnd + 30);
	} else if (targetIdx < renderedStart && renderedStart - targetIdx <= 120) {
		prependPrevBatch(renderedStart - targetIdx + 30);
	} else {
		const win = computeInitialRenderWindow(getDisplayItems().length, targetIdx, BATCH_SIZE);
		mountRenderWindow(win.start, win.end);
	}

	const el = findRenderedElementForItem(targetItem);
	if (el) {
		scrollElementToFocalBand(el, behavior);
	}
	return el;
}


export function getRenderedStart(): number {
	return renderedStart;
}

export function getRenderedEnd(): number {
	return renderedEnd;
}

export { appendNextBatch, ensureItemRenderedAndScroll, findRenderedElementForItem, io, mountRenderWindow, prependPrevBatch };
