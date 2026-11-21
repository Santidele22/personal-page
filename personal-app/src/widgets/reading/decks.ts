import type { ReaderAlign, ReaderFocusMode, ReaderFont } from '../../features/book/lib/reader';
import { stepReaderScale } from '../../features/book/lib/reader';
import { jumpToChapterByIndex, stepChapter } from './chapterNav';
import {
	chapterBtn,
	chapterDeck,
	chapterList,
	nextChapterBtn,
	prevChapterBtn,
	timerBtn,
	timerDeck,
	viewBtn,
	viewDeck,
} from './dom';
import { applyReaderPrefs, getPrefs, setPrefs } from './prefs';
import { wakeChrome } from './zen';

// The three slides (view preferences, chapter index, timed vigilia): opening,
// closing and the buttons that wire them up.

function closeViewDeck() {
	viewDeck?.classList.remove('open');
	viewBtn?.setAttribute('aria-expanded', 'false');
}

function closeChapterDeck() {
	chapterDeck?.classList.remove('open');
	chapterBtn?.setAttribute('aria-expanded', 'false');
}

function closeTimerDeck() {
	timerDeck?.classList.remove('open');
	timerBtn?.setAttribute('aria-expanded', 'false');
}

function closeAllDecks(except?: 'view' | 'chapter' | 'timer') {
	if (except !== 'view') closeViewDeck();
	if (except !== 'chapter') closeChapterDeck();
	if (except !== 'timer') closeTimerDeck();
}

function openChapterDeck(focusActive = false) {
	if (!chapterDeck) return;
	closeAllDecks('chapter');
	chapterDeck.classList.add('open');
	chapterBtn?.setAttribute('aria-expanded', 'true');
	wakeChrome();
	const activeBtn =
		chapterList?.querySelector<HTMLButtonElement>('.chapter-opt.is-active') ??
		chapterList?.querySelector<HTMLButtonElement>('.chapter-opt');
	if (activeBtn) {
		activeBtn.scrollIntoView({ block: 'nearest' });
		if (focusActive) activeBtn.focus();
	}
}

function openTimerDeck() {
	if (!timerDeck) return;
	closeAllDecks('timer');
	timerDeck.classList.add('open');
	timerBtn?.setAttribute('aria-expanded', 'true');
	wakeChrome();
}

export function initDecks(): void {
	prevChapterBtn?.addEventListener('click', () => stepChapter(-1));
	nextChapterBtn?.addEventListener('click', () => stepChapter(1));
	chapterBtn?.addEventListener('click', () => {
		if (!chapterDeck) return;
		if (chapterDeck.classList.contains('open')) closeChapterDeck();
		else openChapterDeck(false);
	});
	document.getElementById('chapterClose')?.addEventListener('click', closeChapterDeck);
	chapterList?.addEventListener('click', (e) => {
		const btn = (e.target as Element | null)?.closest<HTMLButtonElement>('.chapter-opt');
		if (!btn) return;
		const idx = Number(btn.dataset.chapterIdx ?? -1);
		if (idx >= 0) {
			jumpToChapterByIndex(idx);
			closeChapterDeck();
		}
	});
	timerBtn?.addEventListener('click', () => {
		if (!timerDeck) return;
		if (timerDeck.classList.contains('open')) closeTimerDeck();
		else openTimerDeck();
	});
	document.getElementById('timerClose')?.addEventListener('click', closeTimerDeck);
	viewBtn?.addEventListener('click', () => {
		if (!viewDeck) return;
		const open = !viewDeck.classList.contains('open');
		if (open) closeAllDecks('view');
		viewDeck.classList.toggle('open', open);
		viewBtn?.setAttribute('aria-expanded', String(open));
		wakeChrome();
	});
	document.getElementById('viewClose')?.addEventListener('click', () => {
		closeViewDeck();
	});
	document.getElementById('fontDown')?.addEventListener('click', () => {
		setPrefs({ ...getPrefs(), scale: stepReaderScale(getPrefs().scale, -0.05) });
		applyReaderPrefs(true);
	});
	document.getElementById('fontUp')?.addEventListener('click', () => {
		setPrefs({ ...getPrefs(), scale: stepReaderScale(getPrefs().scale, 0.05) });
		applyReaderPrefs(true);
	});
	document.querySelectorAll<HTMLButtonElement>('[data-pref-font]').forEach((btn) => {
		btn.addEventListener('click', () => {
			setPrefs({ ...getPrefs(), font: (btn.dataset.prefFont as ReaderFont) || 'serif' });
			applyReaderPrefs(true);
		});
	});
	document.querySelectorAll<HTMLButtonElement>('[data-pref-align]').forEach((btn) => {
		btn.addEventListener('click', () => {
			setPrefs({ ...getPrefs(), align: (btn.dataset.prefAlign as ReaderAlign) || 'left' });
			applyReaderPrefs(true);
		});
	});
	document.querySelectorAll<HTMLButtonElement>('[data-pref-focus]').forEach((btn) => {
		btn.addEventListener('click', () => {
			setPrefs({ ...getPrefs(), focus: (btn.dataset.prefFocus as ReaderFocusMode) || 'wide' });
			applyReaderPrefs(true);
		});
	});
}

export { closeAllDecks, closeChapterDeck, closeTimerDeck, closeViewDeck, openChapterDeck, openTimerDeck };
