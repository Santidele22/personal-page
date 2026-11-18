import type { ReaderFocusMode, ReaderPrefs } from '../../features/book/lib/reader';
import { computeFovealBandMetrics, parseReaderPrefs } from '../../features/book/lib/reader';
import { body, fontPctEl } from './dom';
import { announce } from './feedback';

// Reading preferences: type size, typeface, alignment and foveal focus.
const prefsKey = 'vigilia:prefs';
let rawPrefs: string | null = null;
try {
	rawPrefs = localStorage.getItem(prefsKey);
} catch {}
let prefs: ReaderPrefs = parseReaderPrefs(rawPrefs);

function getReaderLineHeightPx(): number {
	const samplePara = document.querySelector<HTMLElement>('#readerArticle p[data-chunk-id]');
	return samplePara ? parseFloat(getComputedStyle(samplePara).lineHeight) || 42 : 42;
}

function updateFovealGeometry() {
	const computedLine = getReaderLineHeightPx();
	const metrics = computeFovealBandMetrics(computedLine, window.innerHeight, prefs.focus);
	body.style.setProperty('--focus-top', `${metrics.topPx}px`);
	body.style.setProperty('--focus-bottom', `${metrics.bottomPx}px`);
}

function applyReaderPrefs(save = true) {
	body.dataset.font = prefs.font;
	body.dataset.align = prefs.align;
	body.dataset.focus = prefs.focus;
	body.style.setProperty('--reader-scale', String(prefs.scale));
	if (fontPctEl) fontPctEl.textContent = `${Math.round(prefs.scale * 100)}%`;

	document.querySelectorAll<HTMLButtonElement>('[data-pref-font]').forEach((b) => {
		b.setAttribute('aria-pressed', String(b.dataset.prefFont === prefs.font));
	});
	document.querySelectorAll<HTMLButtonElement>('[data-pref-align]').forEach((b) => {
		b.setAttribute('aria-pressed', String(b.dataset.prefAlign === prefs.align));
	});
	document.querySelectorAll<HTMLButtonElement>('[data-pref-focus]').forEach((b) => {
		b.setAttribute('aria-pressed', String(b.dataset.prefFocus === prefs.focus));
	});

	updateFovealGeometry();
	if (save) {
		try {
			localStorage.setItem(prefsKey, JSON.stringify(prefs));
		} catch {}
	}
}


export function getPrefs(): ReaderPrefs {
	return prefs;
}

export function setPrefs(next: ReaderPrefs): void {
	prefs = next;
}

export { applyReaderPrefs, getReaderLineHeightPx, updateFovealGeometry, cycleFocusMode };

/** Cycles wide → narrow → off, persisting and announcing the new focus. */

function cycleFocusMode() {
	const order: ReaderFocusMode[] = ['wide', 'narrow', 'off'];
	const idx = order.indexOf(prefs.focus);
	const next = order[(idx + 1) % order.length];
	prefs = { ...prefs, focus: next };
	applyReaderPrefs(true);
	const label =
		next === 'wide' ? 'foco amplio' : next === 'narrow' ? 'foco estrecho' : 'página abierta';
	announce(`<b>${label}</b>`);
}

/** First application of the stored preferences plus the resize hook. */

export function initReaderPrefs(): void {
	applyReaderPrefs(false);
	window.addEventListener('resize', updateFovealGeometry);
}
