import { state } from './state';

// Saved underlines and keywords: wrapping extracted text in annotation spans
// and keeping the right-hand keyword rail in sync.
/**
 * Groups the text nodes of one host into runs of contiguous inline text, so
 * an annotation never matches across two blocks (a paragraph and the next).
 * Inline elements (`strong`, `em`, `code`) stay inside the same group.
 */

function collectReaderTextGroups(container: HTMLElement): Text[][] {
	const groups: Text[][] = [];
	let current: Text[] | null = null;
	let currentBoundary: Element | null = null;
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
	let node: Node | null;
	while ((node = walker.nextNode())) {
		const textNode = node as Text;
		if (!textNode.nodeValue) continue;
		const boundary =
			textNode.parentElement?.closest(
				'p, h2, h3, h4, blockquote, li, pre, aside, .toc-item, .book-opener',
			) ?? null;
		if (!current || currentBoundary !== boundary) {
			current = [];
			currentBoundary = boundary;
			groups.push(current);
		}
		current.push(textNode);
	}
	return groups;
}

/**
 * Finds `targetText` inside `container` and wraps it in annotation spans.
 * A match living in a single text node is wrapped with `surroundContents`;
 * a match split by inline runs (`strong`/`em`/`code`) wraps each matching
 * text-node slice with the same class and dataset attributes, so removal by
 * `markId` or `wordTerm` can clean every part afterwards.
 */

function highlightTextInContainer(
	container: HTMLElement,
	targetText: string,
	className: string,
	attrs: Record<string, string>,
): HTMLSpanElement | null {
	const needle = targetText.trim();
	if (!needle) return null;

	const createAnnotationSpan = () => {
		const span = document.createElement('span');
		span.className = className;
		Object.entries(attrs).forEach(([k, v]) => {
			span.dataset[k] = v;
		});
		return span;
	};

	for (const group of collectReaderTextGroups(container)) {
		const offsets: { node: Text; start: number }[] = [];
		let combined = '';
		for (const textNode of group) {
			offsets.push({ node: textNode, start: combined.length });
			combined += textNode.nodeValue ?? '';
		}

		let searchFrom = 0;
		while (searchFrom < combined.length) {
			const idx = combined.indexOf(needle, searchFrom);
			if (idx < 0) break;
			const end = idx + needle.length;

			const slices: { node: Text; start: number; end: number }[] = [];
			let blocked = false;
			for (const { node: textNode, start } of offsets) {
				const value = textNode.nodeValue ?? '';
				const nodeEnd = start + value.length;
				if (nodeEnd <= idx || start >= end) continue;
				if (textNode.parentElement?.closest('.sub, .kw')) {
					blocked = true;
					break;
				}
				slices.push({
					node: textNode,
					start: Math.max(0, idx - start),
					end: Math.min(value.length, end - start),
				});
			}
			if (blocked || slices.length === 0) {
				searchFrom = idx + 1;
				continue;
			}

			let first: HTMLSpanElement | null = null;
			for (const slice of slices) {
				const span = createAnnotationSpan();
				const range = document.createRange();
				range.setStart(slice.node, slice.start);
				range.setEnd(slice.node, slice.end);
				range.surroundContents(span);
				first ??= span;
			}
			return first;
		}
	}
	return null;
}

/** Every span that belongs to the same annotation after a cross-run split. */

function companionSpans(span: HTMLSpanElement): HTMLSpanElement[] {
	const host = span.closest<HTMLElement>('[data-chunk-id]');
	const selector = span.classList.contains('kw') ? '.kw' : '.sub';
	const markId = span.dataset.markId;
	const wordTerm = span.dataset.wordTerm;
	const candidates = host
		? host.querySelectorAll<HTMLSpanElement>(selector)
		: document.querySelectorAll<HTMLSpanElement>(selector);
	const spans = Array.from(candidates).filter((candidate) => {
		if (candidate === span) return true;
		if (markId) return candidate.dataset.markId === markId;
		if (wordTerm) return candidate.dataset.wordTerm === wordTerm;
		return false;
	});
	return spans.length > 0 ? spans : [span];
}

/** Full text of an annotation even when it was split across inline runs. */

function annotationText(span: HTMLSpanElement): string {
	return companionSpans(span)
		.map((part) => part.textContent ?? '')
		.join('')
		.trim();
}

function appendRailWordItem(term: string, fresh = false) {
	const rail = document.getElementById('rail');
	if (!rail) return;
	const existing = rail.querySelector(`.rail-item[data-term="${CSS.escape(term)}"]`);
	if (existing) return;
	const short = term.length > 30 ? term.slice(0, 30) + '…' : term;
	const item = document.createElement('div');
	item.className = 'rail-item';
	item.dataset.term = term;

	const jump = document.createElement('button');
	jump.type = 'button';
	jump.className = fresh ? 'rail-jump fresh' : 'rail-jump';
	jump.textContent = short;
	jump.dataset.target = term;

	const del = document.createElement('button');
	del.type = 'button';
	del.className = 'rail-del';
	del.textContent = '×';
	del.dataset.removeWord = term;
	del.setAttribute('aria-label', `Borrar keyword ${term}`);

	item.appendChild(jump);
	item.appendChild(del);
	rail.appendChild(item);
	if (fresh) setTimeout(() => jump.classList.remove('fresh'), 3000);
}

function applySavedAnnotationsToHost(host: HTMLElement, chunkIds: readonly string[]) {
	const idSet = new Set(chunkIds);
	state.marks.forEach((mark) => {
		const chunkId = String(mark.anchor || '').split('+')[0];
		if (!idSet.has(chunkId) || !mark.text) return;
		highlightTextInContainer(host, mark.text, `sub sub-${mark.ink || 'aka'}`, {
			markId: mark.id,
		});
	});
	state.words.forEach((w) => {
		if (!w.term) return;
		if (w.anchor && idSet.has(w.anchor)) {
			highlightTextInContainer(host, w.term, 'kw', { wordTerm: w.term });
		}
	});
}

function syncInitialRailWords() {
	state.words.forEach((w) => {
		if (w.term) appendRailWordItem(w.term, false);
	});
}


export {
	annotationText,
	appendRailWordItem,
	applySavedAnnotationsToHost,
	companionSpans,
	highlightTextInContainer,
	syncInitialRailWords,
};
