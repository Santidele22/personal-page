import {
	computeDampedWheelDelta,
	clusterVisualLineTops,
	findAdjacentLineTop,
} from '../../features/book/lib/reader';
import { stage } from './dom';
import { getPrefs, getReaderLineHeightPx } from './prefs';
import { appendNextBatch, prependPrevBatch } from './renderWindow';

// Smooth line-by-line scrolling of the stage and the wheel/keyboard stepping
// that sits on top of it.
let smoothScrollRaf = 0;
let smoothTargetTop: number | null = null;
let lastAppliedScrollTop: number | null = null;
let lastFrameTime = 0;
let pendingLineJump: { targetTop: number; startedAt: number } | null = null;
let lineBlocks: HTMLElement[] = [];

function cancelSmoothScroll() {
	if (smoothScrollRaf) {
		cancelAnimationFrame(smoothScrollRaf);
		smoothScrollRaf = 0;
	}
	smoothTargetTop = null;
	lastAppliedScrollTop = null;
	lastFrameTime = 0;
	pendingLineJump = null;
}

function stepSmoothScroll(now: number) {
	if (!stage || smoothTargetTop === null) {
		cancelSmoothScroll();
		return;
	}
	if (
		lastAppliedScrollTop !== null &&
		Math.abs(stage.scrollTop - lastAppliedScrollTop) > 4
	) {
		cancelSmoothScroll();
		return;
	}
	const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
	lastFrameTime = now;

	const remaining = smoothTargetTop - stage.scrollTop;
	if (Math.abs(remaining) <= 0.6) {
		stage.scrollTop = smoothTargetTop;
		cancelSmoothScroll();
		return;
	}

	const factor = 1 - Math.exp(-12 * dt);
	const prevTop = stage.scrollTop;
	stage.scrollTop = prevTop + remaining * factor;
	lastAppliedScrollTop = stage.scrollTop;

	if (Math.abs(stage.scrollTop - prevTop) < 0.05 && Math.abs(remaining) < 2) {
		cancelSmoothScroll();
		return;
	}

	smoothScrollRaf = requestAnimationFrame(stepSmoothScroll);
}

function nudgeStageSmooth(deltaPx: number) {
	if (!stage || deltaPx === 0) return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		cancelSmoothScroll();
		stage.scrollBy({ top: deltaPx, behavior: 'auto' });
		return;
	}
	if (
		smoothTargetTop === null ||
		(lastAppliedScrollTop !== null && Math.abs(stage.scrollTop - lastAppliedScrollTop) > 4)
	) {
		smoothTargetTop = stage.scrollTop;
	}
	const maxTop = Math.max(0, stage.scrollHeight - stage.clientHeight);
	smoothTargetTop = Math.min(maxTop, Math.max(0, smoothTargetTop + deltaPx));
	if (!smoothScrollRaf) {
		lastFrameTime = performance.now();
		smoothScrollRaf = requestAnimationFrame(stepSmoothScroll);
	}
}


export function initScrollInput(): void {
	stage?.addEventListener('pointerdown', cancelSmoothScroll, { passive: true });
	stage?.addEventListener('touchstart', cancelSmoothScroll, { passive: true });
	stage?.addEventListener(
		'wheel',
		(e) => {
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			if (!e.deltaY) return;
			const target = e.target as Element | null;
			if (target?.closest('.fallback-frame')) return;
			if (!stage || stage.scrollHeight <= stage.clientHeight) return;

			e.preventDefault();
			pendingLineJump = null;
			const damped = computeDampedWheelDelta(
				e.deltaY,
				e.deltaMode,
				getReaderLineHeightPx(),
				window.innerHeight,
			);
			nudgeStageSmooth(damped);
		},
		{ passive: false },
	);
}

function getFocalBandTopPx(): number {
	if (!stage) return window.innerHeight * (getPrefs().focus === 'narrow' ? 0.29 : 0.22);
	const stageRect = stage.getBoundingClientRect();
	const ratio = getPrefs().focus === 'narrow' ? 0.29 : 0.22;
	return stageRect.top + stageRect.height * ratio;
}

function scrollElementToFocalBand(el: Element, behavior: ScrollBehavior = 'smooth') {
	cancelSmoothScroll();
	if (!stage) {
		el.scrollIntoView({ behavior, block: 'center' });
		return;
	}
	const focusTop = getFocalBandTopPx();
	const delta = el.getBoundingClientRect().top - focusTop;
	stage.scrollBy({ top: delta, behavior });
}

function collectBlockLineViewportTops(block: HTMLElement, range: Range, out: number[]) {
	range.selectNodeContents(block);
	const clientRects = range.getClientRects();
	for (let j = 0; j < clientRects.length; j += 1) {
		const r = clientRects[j];
		if (r.width > 0 && r.height > 0) {
			out.push(r.top);
		}
	}
}

function stepLine(direction: 1 | -1, allowExpand = true) {
	if (!stage || lineBlocks.length === 0) return;
	const focusTop = getFocalBandTopPx();
	const lineHeightPx = getReaderLineHeightPx();
	const minGapPx = Math.min(18, Math.max(8, Math.round(lineHeightPx * 0.38)));
	const currentScrollTop = stage.scrollTop;
	const now = Date.now();

	const hasPending =
		pendingLineJump !== null &&
		now - pendingLineJump.startedAt <= 800 &&
		Math.abs(currentScrollTop - pendingLineJump.targetTop) > 4;
	const referenceScrollTop = hasPending ? pendingLineJump!.targetTop : currentScrollTop;
	const refOffset = referenceScrollTop - currentScrollTop;
	const minWindowTop = Math.min(0, refOffset) - 450;
	const maxWindowBottom = Math.max(window.innerHeight, window.innerHeight + refOffset) + 450;

	const rawViewportTops: number[] = [];
	const range = document.createRange();
	let fallbackPrevBlock: HTMLElement | null = null;
	let fallbackNextBlock: HTMLElement | null = null;

	for (let i = 0; i < lineBlocks.length; i += 1) {
		const block = lineBlocks[i];
		const rect = block.getBoundingClientRect();
		if (rect.height === 0 && rect.width === 0) continue;
		if (rect.bottom < minWindowTop) {
			fallbackPrevBlock = block;
			continue;
		}
		if (rect.top > maxWindowBottom) {
			fallbackNextBlock = block;
			break;
		}
		collectBlockLineViewportTops(block, range, rawViewportTops);
	}

	let lineScrollTops = clusterVisualLineTops(rawViewportTops, minGapPx).map(
		(top) => currentScrollTop + (top - focusTop),
	);
	let nextScrollTop = findAdjacentLineTop(lineScrollTops, referenceScrollTop, direction, 6);

	if (nextScrollTop === null) {
		const fallbackBlock = direction > 0 ? fallbackNextBlock : fallbackPrevBlock;
		if (fallbackBlock) {
			const fallbackRaw: number[] = [];
			collectBlockLineViewportTops(fallbackBlock, range, fallbackRaw);
			lineScrollTops = clusterVisualLineTops(fallbackRaw, minGapPx).map(
				(top) => currentScrollTop + (top - focusTop),
			);
			nextScrollTop = findAdjacentLineTop(lineScrollTops, referenceScrollTop, direction, 6);
		}
	}

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';

	if (nextScrollTop === null) {
		if (allowExpand) {
			const expanded = direction > 0 ? appendNextBatch() : prependPrevBatch();
			if (expanded) {
				return stepLine(direction, false);
			}
		}
		if (direction < 0 && referenceScrollTop > 0) {
			cancelSmoothScroll();
			stage.scrollTo({ top: 0, behavior });
		}
		return;
	}

	const maxTop = Math.max(0, stage.scrollHeight - stage.clientHeight);
	const targetTop = Math.min(maxTop, Math.max(0, nextScrollTop));

	cancelSmoothScroll();
	pendingLineJump = { targetTop, startedAt: now };
	stage.scrollTo({ top: targetTop, behavior });
}

/** Drops the pending line-jump anchor once the stage settled on it. */

export function settlePendingLineJump(): void {
	if (pendingLineJump && stage && Math.abs(stage.scrollTop - pendingLineJump.targetTop) <= 4) {
		pendingLineJump = null;
	}
}

/** Keeps the smooth-scroll anchors on the same visual line after a prepend. */

export function shiftScrollAnchors(heightDelta: number): void {
	if (smoothTargetTop !== null) smoothTargetTop += heightDelta;
	if (lastAppliedScrollTop !== null) lastAppliedScrollTop += heightDelta;
	if (pendingLineJump) pendingLineJump.targetTop += heightDelta;
}

/** Re-collects the block elements the line stepper walks through. */

export function refreshLineBlocks(): void {
	lineBlocks = Array.from(
		document.querySelectorAll<HTMLElement>(
			'#readerArticle p[data-mood], #readerArticle h2, #readerArticle h3, #readerArticle h4, #readerArticle blockquote[data-mood], #readerArticle .reader-list li, #readerArticle pre.reader-code, #readerArticle .toc-item .toc-label, #readerArticle .chapter-num',
		),
	);
}

export {
	cancelSmoothScroll,
	getFocalBandTopPx,
	scrollElementToFocalBand,
	stepLine,
};
