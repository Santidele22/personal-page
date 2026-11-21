import { getDisplayItems } from './doc';
import {
	body,
	chapterDeck,
	fullBtn,
	fullLabel,
	selbar,
	stage,
	timerDeck,
	viewDeck,
	vigiliaLockVeil,
	vigiliaSummaryModal,
} from './dom';
import { announce } from './feedback';
import { appendNextBatch, getRenderedEnd, getRenderedStart, prependPrevBatch } from './renderWindow';
import { settlePendingLineJump } from './scroll';

// Zen mode (chrome fades out while reading), the fullscreen toggle and the
// activity that wakes the chrome back up.
let zenTimer: ReturnType<typeof setTimeout> | undefined;
let pointerOverChrome = false;

function hasActiveOverlay(): boolean {
	return Boolean(
		viewDeck?.classList.contains('open') ||
			chapterDeck?.classList.contains('open') ||
			timerDeck?.classList.contains('open') ||
			selbar?.classList.contains('on') ||
			(vigiliaLockVeil && !vigiliaLockVeil.hidden) ||
			(vigiliaSummaryModal && !vigiliaSummaryModal.hidden),
	);
}

function setZen(on: boolean) {
	if (on && (hasActiveOverlay() || pointerOverChrome)) {
		body.dataset.zen = 'off';
		return;
	}
	body.dataset.zen = on ? 'on' : 'off';
}

function wakeChrome(delayMs = 2500) {
	setZen(false);
	if (zenTimer) clearTimeout(zenTimer);
	zenTimer = setTimeout(() => {
		setZen(true);
	}, delayMs);
}

async function toggleFullscreen() {
	try {
		if (!document.fullscreenElement) {
			await document.documentElement.requestFullscreen();
		} else {
			if (body.dataset.vigiliaLocked === 'on') {
				announce('vigilia sellada · pantalla completa bloqueada hasta completar');
				return;
			}
			await document.exitFullscreen();
		}
	} catch {
		announce('pantalla completa no disponible en este navegador');
	}
}

function syncFullscreenButton() {
	const active = Boolean(document.fullscreenElement);
	const locked = body.dataset.vigiliaLocked === 'on';
	fullBtn?.setAttribute('aria-pressed', String(active));
	fullBtn?.classList.toggle('is-locked', active && locked);
	if (fullLabel) {
		fullLabel.textContent = active ? (locked ? 'Sellada' : 'Salir') : 'Inmersión';
	}
}

export function initZen(): void {
	['#topbar', '#bottombar', '#viewDeck', '#chapterDeck', '#timerDeck', '#rail'].forEach((selector) => {
		const el = document.querySelector(selector);
		el?.addEventListener('pointerenter', () => {
			pointerOverChrome = true;
			wakeChrome(4000);
		});
		el?.addEventListener('pointerleave', () => {
			pointerOverChrome = false;
			wakeChrome(2200);
		});
	});
	document.addEventListener(
		'pointermove',
		(e) => {
			if (e.pointerType === 'touch') return;
			const nearTop = e.clientY <= 88;
			const nearBottom = e.clientY >= window.innerHeight - 108;
			if (nearTop || nearBottom || body.dataset.zen !== 'on') {
				wakeChrome(2500);
			}
		},
		{ passive: true },
	);
	let initialLoadSettled = false;
	setTimeout(() => {
		initialLoadSettled = true;
		wakeChrome(2500);
	}, 900);

	stage?.addEventListener(
		'scroll',
		() => {
			if (!stage) return;
			settlePendingLineJump();
			if (getRenderedEnd() < getDisplayItems().length) {
				const remainingBottom = stage.scrollHeight - (stage.scrollTop + stage.clientHeight);
				if (remainingBottom < 1200) {
					appendNextBatch();
				}
			}
			if (getRenderedStart() > 0 && stage.scrollTop < 900) {
				prependPrevBatch();
			}
			if (!initialLoadSettled) return;
			if (!hasActiveOverlay() && !pointerOverChrome) {
				if (zenTimer) clearTimeout(zenTimer);
				zenTimer = setTimeout(() => setZen(true), 450);
			}
		},
		{ passive: true },
	);
	fullBtn?.addEventListener('click', () => {
		void toggleFullscreen();
	});
	document.addEventListener('fullscreenchange', syncFullscreenButton);
}

export { hasActiveOverlay, setZen, syncFullscreenButton, toggleFullscreen, wakeChrome };
