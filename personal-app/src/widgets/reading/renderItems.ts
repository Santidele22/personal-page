import type { BookDisplayItem } from '../../features/book/lib/reader';
import type { ReadingInlineMark, ReadingInlineRun } from '../../entities/book/types';
import { tokenizeCode } from '../../features/book/lib/codeHighlight';
import { applySavedAnnotationsToHost } from './annotations';
import { io } from './renderWindow';

// Builds the DOM for one display item: headings, paragraphs, quotes, lists,
// indices, code blocks and the chapter separators between them.
const INLINE_MARK_TAGS: Record<ReadingInlineMark, 'strong' | 'em' | 'code'> = {
	b: 'strong',
	i: 'em',
	code: 'code',
};
const INLINE_MARK_ORDER: ReadingInlineMark[] = ['b', 'i', 'code'];
const HEADING_NUMBER_MARKER_RE = /^(\d+(?:\.\d+)*|[IVXLCDM]{1,6})\s*·\s*(.+)$/;
const HEADING_NUMBER_DOTTED_RE = /^(\d+\.\d+(?:\.\d+)*)\s+(.+)$/;
const TOC_LABEL_NUMBER_RE = /^(\d+(?:\.\d+)*)\s+(.+)$/;

function appendTextWithBreaks(target: HTMLElement, value: string) {
	const lines = value.split('\n');
	for (let i = 0; i < lines.length; i += 1) {
		if (i > 0) target.appendChild(document.createElement('br'));
		if (lines[i]) target.appendChild(document.createTextNode(lines[i]));
	}
}

/**
 * Renders extracted PDF text as safe DOM nodes: inline runs keep their
 * emphasis (`strong`, `em`, `code`, nested in a stable order) and line
 * breaks become `<br>`. PDF text is never assigned through `innerHTML`.
 */

function appendFormattedContent(
	el: HTMLElement,
	text: string,
	runs?: readonly ReadingInlineRun[],
): HTMLElement {
	if (!runs || runs.length === 0) {
		appendTextWithBreaks(el, text);
		return el;
	}
	for (const run of runs) {
		if (!run.text) continue;
		const marks = INLINE_MARK_ORDER.filter((mark) => run.marks?.includes(mark));
		if (marks.length === 0) {
			appendTextWithBreaks(el, run.text);
			continue;
		}
		let wrapper: HTMLElement | null = null;
		for (let i = marks.length - 1; i >= 0; i -= 1) {
			const node = document.createElement(INLINE_MARK_TAGS[marks[i]]);
			if (marks[i] === 'code') node.className = 'reader-inline-code';
			if (wrapper) node.appendChild(wrapper);
			wrapper = node;
		}
		if (!wrapper) continue;
		appendTextWithBreaks(wrapper, run.text);
		el.appendChild(wrapper);
	}
	if (!el.firstChild) appendTextWithBreaks(el, text);
	return el;
}

/** Splits `1.2 · Título` or `1.2 Título` into numeral + label. */

function splitNumberedLabel(
	text: string,
	markerRe: RegExp,
	dottedRe?: RegExp,
): { number: string; label: string } | null {
	const trimmed = text.trim();
	const marker = trimmed.match(markerRe);
	if (marker) return { number: marker[1], label: marker[2].trim() };
	if (!dottedRe) return null;
	const dotted = trimmed.match(dottedRe);
	if (dotted) return { number: dotted[1], label: dotted[2].trim() };
	return null;
}

function buildChapterBreak(marker: string, page: number): HTMLElement {
	const chBreak = document.createElement('div');
	chBreak.className = 'chapter-break';
	chBreak.dataset.page = String(page);

	const r1 = document.createElement('span');
	r1.className = 'chapter-rule';
	r1.setAttribute('aria-hidden', 'true');

	const chNum = document.createElement('span');
	chNum.className = 'chapter-num';
	chNum.textContent = marker;

	const r2 = document.createElement('span');
	r2.className = 'chapter-rule';
	r2.setAttribute('aria-hidden', 'true');

	chBreak.appendChild(r1);
	chBreak.appendChild(chNum);
	chBreak.appendChild(r2);
	return chBreak;
}

function buildDisplayItemFragment(item: BookDisplayItem, itemIndex: number): DocumentFragment {
	const frag = document.createDocumentFragment();

	switch (item.kind) {
		case 'toc': {
			if (item.parsed.heading) {
				const h2 = document.createElement('h2');
				h2.className = 'toc-heading';
				h2.dataset.chunkId = item.chunkId;
				h2.dataset.page = String(item.page);
				h2.dataset.itemIndex = String(itemIndex);
				h2.textContent = item.parsed.heading;
				frag.appendChild(h2);
			}
			const nav = document.createElement('nav');
			nav.className = 'toc';
			nav.setAttribute('aria-label', item.parsed.heading || 'Índice');
			nav.dataset.chunkId = item.chunkId;
			nav.dataset.chunkIds = item.chunkIds.join(',');
			nav.dataset.page = String(item.page);
			nav.dataset.itemIndex = String(itemIndex);

			const ul = document.createElement('ul');
			ul.className = 'toc-list';
			for (const entry of item.parsed.entries) {
				const li = document.createElement('li');
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'toc-item';
				btn.dataset.tocPage = String(entry.page);
				btn.dataset.tocLabel = entry.label;
				btn.dataset.level = String(entry.level ?? 1);

				const lbl = document.createElement('span');
				lbl.className = 'toc-label';
				const numbered = splitNumberedLabel(entry.label, TOC_LABEL_NUMBER_RE);
				if (numbered) {
					const num = document.createElement('span');
					num.className = 'toc-num';
					num.textContent = numbered.number;
					lbl.appendChild(num);
					lbl.appendChild(document.createTextNode(numbered.label));
				} else {
					lbl.textContent = entry.label;
				}

				const dots = document.createElement('span');
				dots.className = 'toc-dots';
				dots.setAttribute('aria-hidden', 'true');

				const pg = document.createElement('span');
				pg.className = 'toc-page';
				pg.textContent = entry.pageLabel ?? String(entry.page);

				btn.appendChild(lbl);
				btn.appendChild(dots);
				btn.appendChild(pg);
				li.appendChild(btn);
				ul.appendChild(li);
			}
			nav.appendChild(ul);
			applySavedAnnotationsToHost(nav, item.chunkIds);
			frag.appendChild(nav);
			return frag;
		}

		case 'opener': {
			const header = document.createElement('header');
			header.className = 'book-opener';
			header.dataset.chunkId = item.chunkId;
			header.dataset.page = String(item.page);
			header.dataset.itemIndex = String(itemIndex);

			const authorEl = document.createElement('p');
			authorEl.className = 'opener-author';
			authorEl.textContent = item.author;

			const rule = document.createElement('span');
			rule.className = 'opener-rule';
			rule.setAttribute('aria-hidden', 'true');

			const titleEl = document.createElement('h2');
			titleEl.className = 'opener-title';
			titleEl.textContent = item.title;

			header.appendChild(authorEl);
			header.appendChild(rule);
			header.appendChild(titleEl);
			applySavedAnnotationsToHost(header, [item.chunkId]);
			frag.appendChild(header);
			return frag;
		}

		case 'heading': {
			const tag = item.level === 1 ? 'h2' : item.level === 2 ? 'h3' : 'h4';
			const heading = document.createElement(tag);
			heading.dataset.chunkId = item.chunkId;
			heading.dataset.page = String(item.page);
			heading.dataset.itemIndex = String(itemIndex);
			heading.dataset.level = String(item.level);
			if (item.align === 'center') heading.classList.add('align-center');
			if (item.align === 'right') heading.classList.add('align-right');

			const numbered = splitNumberedLabel(
				item.text,
				HEADING_NUMBER_MARKER_RE,
				HEADING_NUMBER_DOTTED_RE,
			);
			if (numbered) {
				heading.classList.add('has-num');
				const num = document.createElement('span');
				num.className = 'h-num';
				num.textContent = numbered.number;
				const title = document.createElement('span');
				title.className = 'h-title';
				title.textContent = numbered.label;
				heading.appendChild(num);
				heading.appendChild(title);
			} else {
				heading.textContent = item.text;
			}

			applySavedAnnotationsToHost(heading, [item.chunkId]);
			io.observe(heading);
			frag.appendChild(heading);
			return frag;
		}

		case 'para': {
			if (item.chapterMarker) {
				frag.appendChild(buildChapterBreak(item.chapterMarker, item.page));
			}

			const p = document.createElement('p');
			const classes: string[] = [];
			if (item.isFirstPara || (item.chapterMarker && !item.verse)) classes.push('dropcap');
			if (item.verse) classes.push('verse');
			if (classes.length > 0) p.className = classes.join(' ');
			p.dataset.chunkId = item.chunkId;
			p.dataset.page = String(item.page);
			p.dataset.itemIndex = String(itemIndex);
			p.dataset.mood = item.mood;
			p.dataset.cues = item.cues.join(', ');
			p.dataset.paraIndex = String(item.paraIndex);
			appendFormattedContent(p, item.text, item.runs);
			applySavedAnnotationsToHost(p, [item.chunkId]);
			io.observe(p);
			frag.appendChild(p);
			return frag;
		}

		case 'quote': {
			const quote = document.createElement('blockquote');
			quote.className = 'reader-quote';
			quote.dataset.chunkId = item.chunkId;
			quote.dataset.page = String(item.page);
			quote.dataset.itemIndex = String(itemIndex);
			quote.dataset.mood = item.mood;
			quote.dataset.cues = item.cues.join(', ');
			quote.dataset.paraIndex = String(item.paraIndex);
			appendFormattedContent(quote, item.text, item.runs);
			applySavedAnnotationsToHost(quote, [item.chunkId]);
			io.observe(quote);
			frag.appendChild(quote);
			return frag;
		}

		case 'list': {
			const list = document.createElement(item.ordered ? 'ol' : 'ul');
			list.className = 'reader-list';
			list.dataset.chunkId = item.chunkId;
			list.dataset.page = String(item.page);
			list.dataset.itemIndex = String(itemIndex);
			list.dataset.mood = item.mood;
			list.dataset.cues = item.cues.join(', ');
			list.dataset.paraIndex = String(item.paraIndex);
			for (const value of item.items) {
				const li = document.createElement('li');
				li.className = 'reader-list-item';
				li.textContent = value;
				list.appendChild(li);
			}
			applySavedAnnotationsToHost(list, [item.chunkId]);
			io.observe(list);
			frag.appendChild(list);
			return frag;
		}

		case 'dedication': {
			const aside = document.createElement('aside');
			aside.className = 'reader-dedication';
			aside.dataset.chunkId = item.chunkId;
			aside.dataset.page = String(item.page);
			aside.dataset.itemIndex = String(itemIndex);
			appendFormattedContent(aside, item.text);
			applySavedAnnotationsToHost(aside, [item.chunkId]);
			frag.appendChild(aside);
			return frag;
		}

		case 'meta': {
			const aside = document.createElement('aside');
			aside.className = 'reader-meta';
			aside.dataset.chunkId = item.chunkId;
			aside.dataset.page = String(item.page);
			aside.dataset.itemIndex = String(itemIndex);
			for (const rawLine of item.text.split('\n')) {
				const line = rawLine.trim();
				if (!line) continue;
				const row = document.createElement('div');
				row.className = 'meta-line';
				row.textContent = line;
				aside.appendChild(row);
			}
			applySavedAnnotationsToHost(aside, [item.chunkId]);
			frag.appendChild(aside);
			return frag;
		}

		case 'caption': {
			const p = document.createElement('p');
			p.className = 'reader-caption';
			p.dataset.chunkId = item.chunkId;
			p.dataset.page = String(item.page);
			p.dataset.itemIndex = String(itemIndex);
			appendFormattedContent(p, item.text);
			applySavedAnnotationsToHost(p, [item.chunkId]);
			frag.appendChild(p);
			return frag;
		}

		case 'code': {
			const pre = document.createElement('pre');
			pre.className = 'reader-code';
			pre.dataset.chunkId = item.chunkId;
			pre.dataset.page = String(item.page);
			pre.dataset.itemIndex = String(itemIndex);
			pre.dataset.mood = item.mood;
			pre.dataset.cues = item.cues.join(', ');
			pre.dataset.paraIndex = String(item.paraIndex);
			const code = document.createElement('code');
			for (const tok of tokenizeCode(item.text)) {
				if (tok.kind === 'plain') {
					code.appendChild(document.createTextNode(tok.text));
				} else {
					const span = document.createElement('span');
					span.className = `tok-${tok.kind}`;
					span.textContent = tok.text;
					code.appendChild(span);
				}
			}
			pre.appendChild(code);
			applySavedAnnotationsToHost(pre, [item.chunkId]);
			io.observe(pre);
			frag.appendChild(pre);
			return frag;
		}
	}
}

export { appendFormattedContent, buildChapterBreak, splitNumberedLabel, buildDisplayItemFragment };
