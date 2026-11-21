import { findActiveChapterIndex } from '../../features/book/lib/reader';
import { stepChapter } from './chapterNav';
import {
	closeAllDecks,
	closeChapterDeck,
	closeTimerDeck,
	openChapterDeck,
	openTimerDeck,
} from './decks';
import { getChapters, getCurrentItemIndex } from './doc';
import {
	body,
	chapterDeck,
	chapterList,
	stage,
	timerDeck,
	vigiliaLockVeil,
	vigiliaSummaryModal,
} from './dom';
import { cycleFocusMode } from './prefs';
import { cancelSmoothScroll, stepLine } from './scroll';
import { hideSelbar } from './selection';
import { closeVigiliaSummary } from './timer';
import { hasActiveOverlay, setZen, toggleFullscreen } from './zen';

// Keyboard map of the vigilia: line and chapter stepping, the decks, zen,
// fullscreen and focus cycling.

export function initKeyboard(): void {
	document.addEventListener('keydown', (e) => {
		if (e.ctrlKey || e.metaKey) return;
		if (e.altKey && !e.getModifierState?.('AltGraph')) return;
		const targetEl = e.target as HTMLElement | null;
		if (
			targetEl &&
			(targetEl.tagName === 'INPUT' ||
				targetEl.tagName === 'TEXTAREA' ||
				targetEl.tagName === 'SELECT' ||
				targetEl.isContentEditable)
		) {
			return;
		}
		const key = e.key.toLowerCase();
		if (vigiliaLockVeil && !vigiliaLockVeil.hidden) {
			if (key === 'escape') e.preventDefault();
			return;
		}
		if (vigiliaSummaryModal && !vigiliaSummaryModal.hidden) {
			if (key === 'escape') {
				e.preventDefault();
				closeVigiliaSummary();
			}
			return;
		}
		if (key === 'escape') {
			if (body.dataset.vigiliaLocked === 'on') {
				e.preventDefault();
			}
			if (hasActiveOverlay()) {
				closeAllDecks();
				hideSelbar();
				return;
			}
			setZen(body.dataset.zen !== 'on');
			return;
		}
		if (chapterDeck?.classList.contains('open')) {
			if (key === 'c') {
				e.preventDefault();
				closeChapterDeck();
				return;
			}
			if (key === 'j' || e.key === 'ArrowDown' || key === 'k' || e.key === 'ArrowUp') {
				e.preventDefault();
				const opts = Array.from(chapterList?.querySelectorAll<HTMLButtonElement>('.chapter-opt') ?? []);
				if (opts.length === 0) return;
				const focusedIdx = opts.indexOf(document.activeElement as HTMLButtonElement);
				const delta = key === 'j' || e.key === 'ArrowDown' ? 1 : -1;
				const fallbackIdx = Math.max(0, findActiveChapterIndex(getChapters(), getCurrentItemIndex()));
				const nextIdx =
					focusedIdx >= 0
						? (focusedIdx + delta + opts.length) % opts.length
						: fallbackIdx;
				opts[nextIdx]?.focus();
				return;
			}
		}
		if (key === 'j' || e.key === 'ArrowDown') {
			e.preventDefault();
			stepLine(1);
		} else if (key === 'k' || e.key === 'ArrowUp') {
			e.preventDefault();
			stepLine(-1);
		} else if (key === 'h' || e.key === '[') {
			e.preventDefault();
			stepChapter(-1);
		} else if (key === 'l' || e.key === ']') {
			e.preventDefault();
			stepChapter(1);
		} else if (key === 'c') {
			e.preventDefault();
			if (chapterDeck?.classList.contains('open')) closeChapterDeck();
			else openChapterDeck(true);
		} else if (key === 't') {
			e.preventDefault();
			if (timerDeck?.classList.contains('open')) closeTimerDeck();
			else openTimerDeck();
		} else if (e.key === ' ') {
			e.preventDefault();
			cancelSmoothScroll();
			stage?.scrollBy({
				top: (e.shiftKey ? -1 : 1) * Math.round(window.innerHeight * 0.55),
				behavior: 'smooth',
			});
		} else if (key === 'f') {
			e.preventDefault();
			void toggleFullscreen();
		} else if (key === 'v') {
			e.preventDefault();
			cycleFocusMode();
		}
	});
}
