import { findActiveChapterIndex, findAdjacentChapterIndex } from '../../features/book/lib/reader';
import { chapterBtnLabel, chapterList, nextChapterBtn, prevChapterBtn } from './dom';
import { getChapters, getCurrentItemIndex, setCurrentItemIndex as storeCurrentItemIndex } from './doc';
import { announce, escapeHtml } from './feedback';
import { ensureItemRenderedAndScroll } from './renderWindow';

// Chapter index: the detected chapter list, its active item and the chapter
// stepping used by the topbar, the deck and the keyboard.

function updateChapterNavUi() {
	const activeIdx = findActiveChapterIndex(getChapters(), getCurrentItemIndex());
	const hasPrev = findAdjacentChapterIndex(getChapters(), getCurrentItemIndex(), -1) !== null;
	const hasNext = findAdjacentChapterIndex(getChapters(), getCurrentItemIndex(), 1) !== null;
	if (prevChapterBtn) prevChapterBtn.disabled = !hasPrev;
	if (nextChapterBtn) nextChapterBtn.disabled = !hasNext;

	if (chapterBtnLabel) {
		if (getChapters().length === 0) {
			chapterBtnLabel.textContent = 'Sin capítulos';
		} else if (activeIdx >= 0) {
			chapterBtnLabel.textContent = `Cap ${activeIdx + 1}/${getChapters().length}`;
		} else {
			chapterBtnLabel.textContent = `Capítulos (${getChapters().length})`;
		}
	}

	chapterList?.querySelectorAll<HTMLButtonElement>('.chapter-opt').forEach((btn, idx) => {
		const active = idx === activeIdx;
		btn.classList.toggle('is-active', active);
		if (active) btn.setAttribute('aria-current', 'true');
		else btn.removeAttribute('aria-current');
	});
}

function setCurrentItemIndex(nextIdx: number) {
	if (!Number.isFinite(nextIdx) || nextIdx < 0) return;
	storeCurrentItemIndex(nextIdx);
	updateChapterNavUi();
}

function renderChapterList() {
	if (!chapterList) return;
	const list = chapterList;
	list.replaceChildren();
	if (getChapters().length === 0) {
		const empty = document.createElement('p');
		empty.className = 'chapter-empty';
		empty.textContent = 'Este documento no tiene capítulos detectados.';
		list.appendChild(empty);
		updateChapterNavUi();
		return;
	}
	getChapters().forEach((chapter, idx) => {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'chapter-opt';
		btn.dataset.chapterIdx = String(idx);

		const titleSpan = document.createElement('span');
		titleSpan.className = 'chapter-opt-title';
		titleSpan.textContent = chapter.title;

		const pageSpan = document.createElement('span');
		pageSpan.className = 'chapter-opt-page';
		pageSpan.textContent = `pág ${chapter.page}`;

		btn.appendChild(titleSpan);
		btn.appendChild(pageSpan);
		list.appendChild(btn);
	});
	updateChapterNavUi();
}

function jumpToChapterByIndex(chapterIdx: number) {
	const chapter = getChapters()[chapterIdx];
	if (!chapter) return;
	setCurrentItemIndex(chapter.itemIndex);
	ensureItemRenderedAndScroll(chapter.itemIndex, 'smooth');
	announce(`capítulo · <b>${escapeHtml(chapter.title)}</b>`);
}

function stepChapter(direction: 1 | -1) {
	if (getChapters().length === 0) {
		announce('este documento no tiene capítulos detectados');
		return;
	}
	const nextChapterIdx = findAdjacentChapterIndex(getChapters(), getCurrentItemIndex(), direction);
	if (nextChapterIdx === null) {
		announce(direction > 0 ? 'último capítulo alcanzado' : 'ya estás en el primer capítulo');
		return;
	}
	jumpToChapterByIndex(nextChapterIdx);
}

export { jumpToChapterByIndex, renderChapterList, setCurrentItemIndex, stepChapter, updateChapterNavUi };
