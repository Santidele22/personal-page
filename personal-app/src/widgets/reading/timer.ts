import {
	abandonTimerSession,
	clampTimerMinutes,
	createIdleTimerSession,
	createTimerSession,
	DEFAULT_TIMER_MINUTES,
	evaluateTimerTick,
	formatTimerClock,
	isNavigationLocked,
	parseCompletedTimersCount,
	type ReadingLockTimer,
} from '../../features/book/lib/reader';
import { closeTimerDeck, openTimerDeck } from './decks';
import {
	bottomBackLink,
	timerAbandonCancelBtn,
	timerAbandonConfirm,
	timerAbandonConfirmBtn,
	timerAbandonPromptBtn,
	timerBarFill,
	timerBtn,
	timerBtnDot,
	timerBtnLabel,
	timerClockDisplay,
	timerCustomMinutes,
	timerRunningView,
	timerSetupView,
	timerStartBtn,
	timerStatsNote,
	topBackLink,
	topTimerClock,
	topTimerPill,
} from './dom';
import { announce } from './feedback';

// The timed vigilia: session countdown, the navigation lock and the abandon
// confirmation flow.
const completedTimersKey = 'vigilia:timers-completed';
let completedTimersCount = 0;
try {
	completedTimersCount = parseCompletedTimersCount(localStorage.getItem(completedTimersKey));
} catch {}

let selectedTimerMinutes = DEFAULT_TIMER_MINUTES;
let timerSession: ReadingLockTimer = createIdleTimerSession();
let timerIntervalId: ReturnType<typeof setInterval> | undefined;

function syncTimerStatsUi() {
	if (!timerStatsNote) return;
	if (completedTimersCount > 0) {
		timerStatsNote.hidden = false;
		timerStatsNote.textContent =
			completedTimersCount === 1
				? '1 sesión completada en este navegador.'
				: `${completedTimersCount} sesiones completadas en este navegador.`;
	} else {
		timerStatsNote.hidden = true;
	}
}

function syncTimerPresetUi() {
	document.querySelectorAll<HTMLButtonElement>('[data-timer-preset]').forEach((btn) => {
		const val = Number(btn.dataset.timerPreset || 0);
		btn.setAttribute('aria-pressed', String(val === selectedTimerMinutes));
	});
	if (timerCustomMinutes && Number(timerCustomMinutes.value) !== selectedTimerMinutes) {
		timerCustomMinutes.value = String(selectedTimerMinutes);
	}
}

function syncNavigationLockUi(locked: boolean) {
	[topBackLink, bottomBackLink].forEach((link) => {
		if (!link) return;
		link.classList.toggle('is-locked', locked);
		if (locked) link.setAttribute('aria-disabled', 'true');
		else link.removeAttribute('aria-disabled');
	});
}

function renderTimerUi(remainingMs = 0) {
	const locked = isNavigationLocked(timerSession);
	syncNavigationLockUi(locked);
	const clock = formatTimerClock(remainingMs);

	if (timerSetupView) timerSetupView.hidden = locked;
	if (timerRunningView) timerRunningView.hidden = !locked;
	if (topTimerPill) topTimerPill.hidden = !locked;
	if (timerBtnDot) timerBtnDot.hidden = !locked;
	timerBtn?.classList.toggle('is-running', locked);

	if (locked) {
		if (topTimerClock) topTimerClock.textContent = clock;
		if (timerClockDisplay) timerClockDisplay.textContent = clock;
		if (timerBtnLabel) timerBtnLabel.textContent = clock;
		if (timerBarFill && timerSession.durationMs > 0) {
			const elapsedPct = Math.min(
				100,
				Math.max(0, ((timerSession.durationMs - remainingMs) / timerSession.durationMs) * 100),
			);
			timerBarFill.style.width = `${elapsedPct.toFixed(1)}%`;
		}
	} else {
		if (timerBtnLabel) timerBtnLabel.textContent = 'Vigilia';
		if (timerBarFill) timerBarFill.style.width = '0%';
		if (timerAbandonConfirm) timerAbandonConfirm.hidden = true;
	}
	syncTimerStatsUi();
}

function stopTimerLoop() {
	if (timerIntervalId) {
		clearInterval(timerIntervalId);
		timerIntervalId = undefined;
	}
}

function tickTimer() {
	const result = evaluateTimerTick(timerSession, Date.now());
	timerSession = result.session;
	if (result.justCompleted) {
		stopTimerLoop();
		completedTimersCount += 1;
		try {
			localStorage.setItem(completedTimersKey, String(completedTimersCount));
		} catch {}
		renderTimerUi(0);
		const mins = Math.round(timerSession.durationMs / 60_000);
		announce(`vigilia completada · <b>${mins} min</b> — salida desbloqueada`);
		return;
	}
	renderTimerUi(result.remainingMs);
}

function startLockTimer(minutes: number) {
	const cleanMinutes = clampTimerMinutes(minutes);
	selectedTimerMinutes = cleanMinutes;
	syncTimerPresetUi();
	stopTimerLoop();
	timerSession = createTimerSession(cleanMinutes, Date.now());
	if (timerAbandonConfirm) timerAbandonConfirm.hidden = true;
	renderTimerUi(timerSession.durationMs);
	timerIntervalId = setInterval(tickTimer, 250);
	announce(`vigilia iniciada · <b>${cleanMinutes} min</b> — salida bloqueada hasta completar`);
}

function confirmAbandonTimer() {
	if (!isNavigationLocked(timerSession)) return;
	stopTimerLoop();
	timerSession = abandonTimerSession(timerSession);
	renderTimerUi(0);
	closeTimerDeck();
	announce('vigilia abandonada · salida desbloqueada');
}

export function initTimer(): void {
		syncTimerPresetUi();
		renderTimerUi(0);
	document.querySelectorAll<HTMLButtonElement>('[data-timer-preset]').forEach((btn) => {
		btn.addEventListener('click', () => {
			selectedTimerMinutes = clampTimerMinutes(Number(btn.dataset.timerPreset || DEFAULT_TIMER_MINUTES));
			syncTimerPresetUi();
		});
	});
	timerCustomMinutes?.addEventListener('input', () => {
		const input = timerCustomMinutes;
		if (!input) return;
		const raw = Number(input.value);
		if (Number.isFinite(raw) && raw > 0) {
			selectedTimerMinutes = clampTimerMinutes(raw);
			document.querySelectorAll<HTMLButtonElement>('[data-timer-preset]').forEach((btn) => {
				btn.setAttribute('aria-pressed', String(Number(btn.dataset.timerPreset) === selectedTimerMinutes));
			});
		}
	});
	timerCustomMinutes?.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			const input = timerCustomMinutes;
			startLockTimer(Number(input?.value || selectedTimerMinutes));
		}
	});
	timerStartBtn?.addEventListener('click', () => {
		const inputVal = timerCustomMinutes ? Number(timerCustomMinutes.value) : selectedTimerMinutes;
		startLockTimer(Number.isFinite(inputVal) && inputVal > 0 ? inputVal : selectedTimerMinutes);
	});
	timerAbandonPromptBtn?.addEventListener('click', () => {
		if (timerAbandonConfirm) timerAbandonConfirm.hidden = false;
	});
	timerAbandonCancelBtn?.addEventListener('click', () => {
		if (timerAbandonConfirm) timerAbandonConfirm.hidden = true;
	});
	timerAbandonConfirmBtn?.addEventListener('click', confirmAbandonTimer);

	[topBackLink, bottomBackLink].forEach((link) => {
		link?.addEventListener('click', (e) => {
			if (!isNavigationLocked(timerSession)) return;
			e.preventDefault();
			const rem = Math.max(0, timerSession.endsAtMs - Date.now());
			openTimerDeck();
			announce(`vigilia activa · faltan <b>${formatTimerClock(rem)}</b> — confirmá abandono para salir`);
		});
	});

	window.addEventListener('beforeunload', (e) => {
		if (!isNavigationLocked(timerSession)) return;
		e.preventDefault();
		// `returnValue` is the legacy string form browsers still honour here.
		(e as unknown as { returnValue: string }).returnValue = '';
	});
}

export { confirmAbandonTimer, renderTimerUi, startLockTimer, syncTimerPresetUi };
