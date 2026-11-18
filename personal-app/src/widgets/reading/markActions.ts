import {
	findKeywordJumpTargetIndex,
	findTocJumpTargetIndex,
	removeWordFromState,
} from '../../features/book/lib/reader';
import { annotationText, appendRailWordItem, companionSpans } from './annotations';
import { getDisplayItems } from './doc';
import { body, delMarkBtn, kwBtn, rail, readerArticle, selbar, stage } from './dom';
import { announce, escapeHtml } from './feedback';
import { getPrefs } from './prefs';
import { ensureItemRenderedAndScroll } from './renderWindow';
import { scrollElementToFocalBand } from './scroll';
import {
	findIntersectingSubOrKw,
	getActiveEditSpan,
	getSelRange,
	hideSelbar,
	openEditBarForSpan,
	removeSpanAndState,
	unwrapSpan,
	wrapSelection,
} from './selection';
import { persistReadingState } from './status';
import { state } from './state';
import { setZen } from './zen';

// Actions of the selection pill: underline in three inks, mark a keyword,
// remove a mark, and jump from the keyword rail back into the text.

export function initMarkActions(): void {
	readerArticle?.addEventListener('click', (e) => {
		const sel = window.getSelection();
		if (sel && !sel.isCollapsed) return;

		const target = e.target as Element | null;
		const tocBtn = target?.closest<HTMLButtonElement>('.toc-item');
		if (tocBtn) {
			const targetLabel = tocBtn.dataset.tocLabel || '';
			const targetPage = Number(tocBtn.dataset.tocPage || 0);
			const targetIdx = findTocJumpTargetIndex(getDisplayItems(), targetLabel, targetPage);
			if (targetIdx !== null) {
				ensureItemRenderedAndScroll(targetIdx, 'smooth');
				announce(`saltando a · <b>${escapeHtml(targetLabel)}</b>`);
			} else {
				announce('sección no localizada en el texto extraído');
			}
			return;
		}

		const markEl = target?.closest<HTMLSpanElement>('.sub, .kw');
		if (markEl) {
			openEditBarForSpan(markEl);
			return;
		}

		const para = target?.closest<HTMLElement>(
			'#readerArticle p[data-chunk-id], #readerArticle blockquote[data-chunk-id], #readerArticle .reader-list[data-chunk-id], #readerArticle pre.reader-code[data-chunk-id]',
		);
		if (para && !target?.closest('a, button')) {
			const stageRect = stage?.getBoundingClientRect();
			const pRect = para.getBoundingClientRect();
			if (stageRect) {
				const ratio = getPrefs().focus === 'narrow' ? 0.29 : 0.22;
				const focusTop = stageRect.top + stageRect.height * ratio;
				const focusBottom = focusTop + (getPrefs().focus === 'narrow' ? 140 : 280);
				if (pRect.top < focusTop - 16 || pRect.top > focusBottom) {
					scrollElementToFocalBand(para, 'smooth');
				} else if (window.matchMedia('(pointer: coarse)').matches) {
					setZen(body.dataset.zen !== 'on');
				}
			}
		}
	});

	delMarkBtn?.addEventListener('click', () => {
		const selection = getSelRange();
		const targetSpan =
			getActiveEditSpan() ?? (selection ? findIntersectingSubOrKw(selection) : null);
		if (targetSpan) {
			removeSpanAndState(targetSpan);
		}
		window.getSelection()?.removeAllRanges();
		hideSelbar();
	});

	selbar?.querySelectorAll<HTMLButtonElement>('.ink').forEach((btn) => {
		btn.addEventListener('click', () => {
			const inkAttr = btn.dataset.ink || 'sub-aka';
			const inkName = inkAttr.replace(/^sub-/, '') as 'aka' | 'bronce' | 'tinta';
			const activeSpan = getActiveEditSpan();

			if (activeSpan && activeSpan.classList.contains('sub')) {
				companionSpans(activeSpan).forEach((part) => {
					part.classList.remove('sub-aka', 'sub-bronce', 'sub-tinta');
					part.classList.add(inkAttr);
				});
				const markId = activeSpan.dataset.markId;
				const text = annotationText(activeSpan);
				const chunkId = activeSpan.closest<HTMLElement>('[data-chunk-id]')?.dataset.chunkId;
				const existing = state.marks.find(
					(m) =>
						(markId && m.id === markId) ||
						((m.text || '').trim() === text &&
							(!chunkId || String(m.anchor || '').split('+')[0] === chunkId)),
				);
				if (existing) {
					existing.ink = inkName;
				}
				void persistReadingState();
				announce('tinta actualizada');
				hideSelbar();
				return;
			}

			const wrapped = wrapSelection('sub ' + inkAttr);
			if (wrapped && wrapped.text) {
				const markId = 'm-' + Date.now();
				wrapped.span.dataset.markId = markId;
				state.marks.push({
					id: markId,
					kind: 'underline',
					ink: inkName,
					anchor: `${wrapped.chunkId}+[0,${wrapped.text.length}]`,
					text: wrapped.text,
				});
				void persistReadingState();
				announce('subrayado en tinta · <b>cuaderno de márgenes</b>');
			}
			window.getSelection()?.removeAllRanges();
			hideSelbar();
		});
	});

	kwBtn?.addEventListener('click', () => {
		const activeSpan = getActiveEditSpan();
		if (activeSpan && activeSpan.classList.contains('sub')) {
			const t = annotationText(activeSpan);
			if (t) {
				const chunkId =
					activeSpan.closest<HTMLElement>('[data-chunk-id]')?.dataset.chunkId ||
					'p0001.0000';
				appendRailWordItem(t, true);
				state.words.push({ term: t, anchor: chunkId });
				void persistReadingState();
				const short = t.length > 30 ? t.slice(0, 30) + '…' : t;
				announce('◇ keyword · <b>' + short + '</b> → riel del capítulo');
			}
			hideSelbar();
			return;
		}
		const wrapped = wrapSelection('kw');
		if (wrapped && wrapped.text) {
			const t = wrapped.text;
			wrapped.span.dataset.wordTerm = t;
			const short = t.length > 30 ? t.slice(0, 30) + '…' : t;
			appendRailWordItem(t, true);
			state.words.push({
				term: t,
				anchor: wrapped.chunkId,
			});
			void persistReadingState();
			announce('◇ keyword · <b>' + short + '</b> → riel del capítulo');
		}
		window.getSelection()?.removeAllRanges();
		hideSelbar();
	});

	rail?.addEventListener('click', (e) => {
		const target = e.target as Element | null;
		const removeBtn = target?.closest<HTMLButtonElement>('button[data-remove-word]');
		if (removeBtn) {
			const term = (removeBtn.dataset.removeWord || '').trim();
			if (!term) return;
			state.words = removeWordFromState(state.words, { term });
			removeBtn.closest('.rail-item')?.remove();
			document.querySelectorAll<HTMLSpanElement>('.kw').forEach((kw) => {
				const kwTerm = (kw.dataset.wordTerm || kw.textContent || '').trim();
				if (kwTerm === term) unwrapSpan(kw);
			});
			void persistReadingState();
			announce('keyword borrada del margen');
			return;
		}

		const jumpBtn = target?.closest<HTMLButtonElement>('button[data-target]');
		if (!jumpBtn) return;
		const targetTerm = (jumpBtn.dataset.target || '').trim();
		const kw = Array.from(document.querySelectorAll<HTMLElement>('.kw')).find((k) => {
			const kwTerm = (k.dataset.wordTerm || k.textContent || '').trim();
			return kwTerm === targetTerm || kwTerm.startsWith(targetTerm.slice(0, 10));
		});
		if (kw) {
			scrollElementToFocalBand(kw, 'smooth');
			return;
		}
		const saved = state.words.find((w) => w.term.trim() === targetTerm && w.anchor);
		const targetIdx = findKeywordJumpTargetIndex(getDisplayItems(), targetTerm, saved?.anchor);
		if (targetIdx !== null) {
			const hostEl = ensureItemRenderedAndScroll(targetIdx, 'smooth');
			const mountedKw = Array.from(
				hostEl?.querySelectorAll<HTMLElement>('.kw') ?? [],
			).find((k) => {
				const kwTerm = (k.dataset.wordTerm || k.textContent || '').trim();
				return kwTerm === targetTerm || kwTerm.startsWith(targetTerm.slice(0, 10));
			});
			if (mountedKw) {
				scrollElementToFocalBand(mountedKw, 'smooth');
			}
		}
	});
}
