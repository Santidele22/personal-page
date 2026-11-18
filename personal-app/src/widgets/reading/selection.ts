import { removeMarkFromState, removeWordFromState } from '../../features/book/lib/reader';
import { annotationText, companionSpans } from './annotations';
import {
	chapterDeck,
	delMarkBtn,
	delSep,
	kwBtn,
	kwSep,
	rail,
	readerArticle,
	selbar,
	timerDeck,
	viewDeck,
} from './dom';
import { closeChapterDeck, closeTimerDeck, closeViewDeck } from './decks';
import { announce } from './feedback';
import { persistReadingState } from './status';
import { state } from './state';

// The selection pill (underlines, keyword, delete) and the handlers that add,
// recolor and remove annotations over the rendered text.
let selRange: Range | null = null;
let activeEditSpan: HTMLSpanElement | null = null;

function placeSelbarAtRect(r: DOMRect) {
	if (!selbar) return;
	selbar.classList.add('on');
	const bw = selbar.offsetWidth || 180;
	selbar.style.left =
		Math.max(20, Math.min(r.left + r.width / 2 - bw / 2, innerWidth - bw - 20)) + 'px';
	selbar.style.top = Math.max(70, r.top - 48) + 'px';
}

function hideSelbar() {
	selbar?.classList.remove('on');
	activeEditSpan = null;
	selRange = null;
}

function findIntersectingSubOrKw(range: Range): HTMLSpanElement | null {
	if (!readerArticle) return null;
	const spans = readerArticle.querySelectorAll<HTMLSpanElement>('.sub, .kw');
	for (const span of spans) {
		try {
			if (range.intersectsNode(span)) return span;
		} catch {}
	}
	return null;
}

function openEditBarForSpan(span: HTMLSpanElement) {
	activeEditSpan = span;
	selRange = null;
	const isKeyword = span.classList.contains('kw');
	if (kwBtn && kwSep) {
		kwBtn.hidden = isKeyword;
		kwSep.hidden = isKeyword;
	}
	if (delMarkBtn && delSep) {
		delMarkBtn.hidden = false;
		delSep.hidden = false;
	}
	placeSelbarAtRect(span.getBoundingClientRect());
}

function positionSelbar() {
	const s = window.getSelection();
	if (!s || s.isCollapsed || s.rangeCount === 0 || !selbar) {
		if (!activeEditSpan) selbar?.classList.remove('on');
		return;
	}
	const range = s.getRangeAt(0);
	if (!readerArticle?.contains(range.commonAncestorContainer)) {
		if (!activeEditSpan) selbar.classList.remove('on');
		return;
	}
	const r = range.getBoundingClientRect();
	if (!r.width) {
		if (!activeEditSpan) selbar.classList.remove('on');
		return;
	}
	activeEditSpan = null;
	selRange = range;
	const existingMatch = findIntersectingSubOrKw(range);
	if (delMarkBtn && delSep) {
		const showDel = Boolean(existingMatch);
		delMarkBtn.hidden = !showDel;
		delSep.hidden = !showDel;
	}
	if (kwBtn && kwSep) {
		kwBtn.hidden = false;
		kwSep.hidden = false;
	}
	placeSelbarAtRect(r);
}

function unwrapSpan(span: HTMLSpanElement) {
	const parent = span.parentNode;
	if (!parent) return;
	while (span.firstChild) {
		parent.insertBefore(span.firstChild, span);
	}
	parent.removeChild(span);
	parent.normalize();
}

function removeSpanAndState(span: HTMLSpanElement) {
	const spans = companionSpans(span);
	const hostPara = span.closest<HTMLElement>('[data-chunk-id]');
	const chunkId = hostPara?.dataset.chunkId;
	const text = annotationText(span);

	if (span.classList.contains('kw')) {
		const term = (span.dataset.wordTerm || text).trim();
		state.words = removeWordFromState(state.words, { term, anchor: chunkId });
		spans.forEach((part) => unwrapSpan(part));
		const stillHasTerm = state.words.some((w) => w.term.trim() === term);
		if (!stillHasTerm) {
			rail?.querySelector(`.rail-item[data-term="${CSS.escape(term)}"]`)?.remove();
		}
		void persistReadingState();
		announce('keyword borrada del margen');
		return;
	}

	state.marks = removeMarkFromState(state.marks, {
		id: span.dataset.markId,
		chunkId,
		text,
	});
	spans.forEach((part) => unwrapSpan(part));
	void persistReadingState();
	announce('subrayado borrado');
}

function wrapSelection(
	cls: string,
): { span: HTMLSpanElement; text: string; chunkId: string } | null {
	if (!selRange) return null;
	try {
		const node = selRange.commonAncestorContainer;
		const hostPara =
			node.nodeType === 1
				? (node as Element).closest<HTMLElement>('[data-chunk-id]')
				: node.parentElement?.closest<HTMLElement>('[data-chunk-id]');
		const chunkId = hostPara?.dataset?.chunkId || 'p0001.0000';
		const span = document.createElement('span');
		span.className = cls;
		span.appendChild(selRange.extractContents());
		selRange.insertNode(span);
		const text = (span.textContent || '').trim();
		return { span, text, chunkId };
	} catch {
		return null;
	}
}

export function getActiveEditSpan(): HTMLSpanElement | null {
	return activeEditSpan;
}

export function getSelRange(): Range | null {
	return selRange;
}

export function initSelection(): void {
	document.addEventListener('selectionchange', positionSelbar);
	document.addEventListener('pointerdown', (e) => {
		const target = e.target as Element | null;
		if (viewDeck?.classList.contains('open') && !target?.closest('#viewDeck, #viewBtn')) {
			closeViewDeck();
		}
		if (chapterDeck?.classList.contains('open') && !target?.closest('#chapterDeck, #chapterBtn')) {
			closeChapterDeck();
		}
		if (timerDeck?.classList.contains('open') && !target?.closest('#timerDeck, #timerBtn, #topBackLink, #bottomBackLink')) {
			closeTimerDeck();
		}
		if (!activeEditSpan) return;
		if (target?.closest('#selbar, .sub, .kw')) return;
		hideSelbar();
	});
	addEventListener(
		'scroll',
		() => {
			if (!selbar?.classList.contains('on')) return;
			if (activeEditSpan) {
				if (!activeEditSpan.isConnected) {
					hideSelbar();
				} else {
					placeSelbarAtRect(activeEditSpan.getBoundingClientRect());
				}
				return;
			}
			positionSelbar();
		},
		true,
	);
}

export {
	findIntersectingSubOrKw,
	hideSelbar,
	openEditBarForSpan,
	removeSpanAndState,
	unwrapSpan,
	wrapSelection,
};
