import {
	clampTimerMinutes,
	createIdleTimerSession,
	createTimerSession,
	DEFAULT_TIMER_MINUTES,
	evaluateTimerTick,
	formatTimerClock,
	isNavigationLocked,
	parseChimeMuted,
	parseCompletedTimersCount,
	parseLastTimerMinutes,
	parsePersistedTimerSession,
	pauseTimerSession,
	resumeTimerSession,
	serializeTimerSession,
	type ReadingLockTimer,
} from '../../features/book/lib/reader';
import { playCompletionChime, primeChimeAudio } from './chime';
import { closeAllDecks, closeTimerDeck, openTimerDeck } from './decks';
import {
	timerChimeToggle,
	timerCustomMinutes,
	timerStartBtn,
	vigiliaLockVeil,
	vigiliaResumeBtn,
	vigiliaSummaryContinueBtn,
	vigiliaSummaryExitLink,
	vigiliaSummaryModal,
} from './dom';
import { announce } from './feedback';
import { bookId, state } from './state';
import {
	hideCompletionSummaryModal,
	hideLockVeil,
	openCompletionSummaryModal,
	renderTimerView,
	showLockVeil,
	syncChimeToggleUi,
	syncTimerPresetUi as applyTimerPresetUi,
} from './timerUi';
import { syncFullscreenButton } from './zen';

// Strict lock-in vigilia controller: configurable countdown, fullscreen lock,
// tab/blur auto-pause, F5 & back-button persistence, and completion flow.

type KeyboardLockNavigator = Navigator & {
	keyboard?: { lock?: (keyCodes?: string[]) => Promise<void>; unlock?: () => void };
};

const completedTimersKey = 'vigilia:timers-completed';
const lastMinutesKey = 'vigilia:last-minutes';
const chimeMutedKey = 'vigilia:chime-muted';
const activeLockKey = `vigilia:active-lock:${bookId}`;

function readStorage(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key: string, value: string | null): void {
	try {
		if (value === null) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	} catch {}
}

let completedTimersCount = parseCompletedTimersCount(readStorage(completedTimersKey));
let selectedTimerMinutes = parseLastTimerMinutes(readStorage(lastMinutesKey));
let chimeMuted = parseChimeMuted(readStorage(chimeMutedKey));

let timerSession: ReadingLockTimer = createIdleTimerSession();
let timerIntervalId: ReturnType<typeof setInterval> | undefined;
let fullscreenEnforced = false;
let historyGuarded = false;
let lastPersistedWholeSecond = -1;

async function lockEscapeKey(): Promise<void> {
	try {
		await (navigator as KeyboardLockNavigator).keyboard?.lock?.(['Escape']);
	} catch {}
}

function unlockEscapeKey(): void {
	try {
		(navigator as KeyboardLockNavigator).keyboard?.unlock?.();
	} catch {}
}

async function enterLockFullscreen(): Promise<boolean> {
	try {
		if (!document.fullscreenElement) {
			if (document.fullscreenEnabled === false || !document.documentElement.requestFullscreen) {
				return false;
			}
			await document.documentElement.requestFullscreen();
		}
		await lockEscapeKey();
		return Boolean(document.fullscreenElement);
	} catch {
		return false;
	}
}

function persistActiveSession(): void {
	writeStorage(activeLockKey, serializeTimerSession(timerSession));
}

function installHistoryGuard(): void {
	if (historyGuarded) return;
	try {
		window.history.pushState({ vigiliaLock: true }, '', window.location.href);
		historyGuarded = true;
	} catch {}
}

function renderTimerUi(remainingMs = timerSession.remainingMs): void {
	renderTimerView(timerSession, remainingMs, completedTimersCount, chimeMuted);
}

function syncTimerPresetUi(syncInput = true): void {
	applyTimerPresetUi(selectedTimerMinutes, syncInput);
}

function stopTimerLoop(): void {
	if (!timerIntervalId) return;
	clearInterval(timerIntervalId);
	timerIntervalId = undefined;
}

function ensureTimerLoop(): void {
	if (!timerIntervalId) timerIntervalId = setInterval(tickTimer, 250);
}

function getLockedRemainingMs(): number {
	return timerSession.status === 'running'
		? evaluateTimerTick(timerSession, Date.now()).remainingMs
		: timerSession.remainingMs;
}

function pauseActiveSession(
	reasonText: string | null,
	options?: { showVeil?: boolean; countPause?: boolean },
): void {
	if (timerSession.status !== 'running') {
		if (options?.showVeil && isNavigationLocked(timerSession) && reasonText) {
			showLockVeil(reasonText, timerSession.remainingMs);
		}
		return;
	}
	timerSession = pauseTimerSession(timerSession, Date.now(), { countPause: options?.countPause });
	persistActiveSession();
	renderTimerUi(timerSession.remainingMs);
	if (options?.showVeil && reasonText) showLockVeil(reasonText, timerSession.remainingMs);
}

function resumeActiveSession(announceText?: string): void {
	if (timerSession.status !== 'paused') return;
	timerSession = resumeTimerSession(timerSession, Date.now());
	lastPersistedWholeSecond = Math.ceil(timerSession.remainingMs / 1000);
	persistActiveSession();
	hideLockVeil();
	ensureTimerLoop();
	renderTimerUi(timerSession.remainingMs);
	if (announceText) announce(announceText);
}

function handleTimerCompleted(): void {
	stopTimerLoop();
	lastPersistedWholeSecond = -1;
	writeStorage(activeLockKey, null);
	fullscreenEnforced = false;
	unlockEscapeKey();
	hideLockVeil();

	completedTimersCount += 1;
	writeStorage(completedTimersKey, String(completedTimersCount));
	if (!chimeMuted) playCompletionChime();

	renderTimerUi(0);
	closeAllDecks();
	openCompletionSummaryModal(timerSession);
	const mins = Math.max(1, Math.round(timerSession.durationMs / 60_000));
	announce(`vigilia completada · <b>${mins} min</b> — salida desbloqueada`);
}

function closeVigiliaSummary(): void {
	hideCompletionSummaryModal();
	timerSession = createIdleTimerSession();
	renderTimerUi(0);
}

function tickTimer(): void {
	if (timerSession.status !== 'running') {
		renderTimerUi(timerSession.remainingMs);
		return;
	}
	const result = evaluateTimerTick(timerSession, Date.now());
	timerSession = result.session;
	if (result.justCompleted) {
		handleTimerCompleted();
		return;
	}
	const wholeSec = Math.ceil(result.remainingMs / 1000);
	if (wholeSec !== lastPersistedWholeSecond) {
		lastPersistedWholeSecond = wholeSec;
		persistActiveSession();
	}
	renderTimerUi(result.remainingMs);
}

function startLockTimer(minutes: number): void {
	primeChimeAudio();
	const cleanMinutes = clampTimerMinutes(minutes);
	selectedTimerMinutes = cleanMinutes;
	writeStorage(lastMinutesKey, String(cleanMinutes));
	syncTimerPresetUi();
	stopTimerLoop();

	timerSession = createTimerSession(cleanMinutes, Date.now(), {
		bookId,
		startPage: state.progress.page || 1,
		startPct: state.progress.pct || 0,
	});
	lastPersistedWholeSecond = Math.ceil(timerSession.remainingMs / 1000);
	persistActiveSession();
	installHistoryGuard();
	closeTimerDeck();
	ensureTimerLoop();
	renderTimerUi(timerSession.remainingMs);

	void enterLockFullscreen().then((entered) => {
		if (!isNavigationLocked(timerSession)) return;
		fullscreenEnforced = entered;
		syncFullscreenButton();
		announce(
			entered
				? `vigilia sellada · <b>${cleanMinutes} min</b> — pantalla completa y salida bloqueada`
				: `vigilia iniciada · <b>${cleanMinutes} min</b> — salida bloqueada hasta completar`,
		);
	});
}

function canAutoResumeOnFocus(): boolean {
	if (timerSession.status !== 'paused') return false;
	if (document.visibilityState !== 'visible' || !document.hasFocus()) return false;
	if (vigiliaLockVeil && !vigiliaLockVeil.hidden) return false;
	return !fullscreenEnforced || Boolean(document.fullscreenElement);
}

function bindTimerControls(): void {
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
			syncTimerPresetUi(false);
		}
	});
	timerCustomMinutes?.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		const input = timerCustomMinutes;
		startLockTimer(Number(input?.value || selectedTimerMinutes));
	});
	timerStartBtn?.addEventListener('click', () => {
		const input = timerCustomMinutes;
		const inputVal = input ? Number(input.value) : selectedTimerMinutes;
		startLockTimer(Number.isFinite(inputVal) && inputVal > 0 ? inputVal : selectedTimerMinutes);
	});
	timerChimeToggle?.addEventListener('click', () => {
		chimeMuted = !chimeMuted;
		writeStorage(chimeMutedKey, chimeMuted ? '1' : '0');
		if (!chimeMuted) primeChimeAudio();
		syncChimeToggleUi(chimeMuted);
	});
	vigiliaResumeBtn?.addEventListener('click', () => {
		primeChimeAudio();
		void enterLockFullscreen().then((entered) => {
			if (!isNavigationLocked(timerSession)) return;
			fullscreenEnforced = entered;
			resumeActiveSession(entered ? 'vigilia reanudada en pantalla completa' : 'vigilia reanudada');
		});
	});
	vigiliaSummaryContinueBtn?.addEventListener('click', closeVigiliaSummary);
	vigiliaSummaryExitLink?.addEventListener('click', () => {
		if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
	});
}

function bindTimerLockGuards(): void {
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') pauseActiveSession(null, { showVeil: false, countPause: true });
		else if (canAutoResumeOnFocus()) resumeActiveSession('vigilia reanudada · el reloj se pausó mientras saliste');
	});
	window.addEventListener('blur', () => {
		if (timerSession.status === 'running' && document.activeElement?.tagName !== 'IFRAME') {
			pauseActiveSession(null, { showVeil: false, countPause: true });
		}
	});
	window.addEventListener('focus', () => {
		if (canAutoResumeOnFocus()) resumeActiveSession('vigilia reanudada · el reloj se pausó mientras saliste');
	});
	document.addEventListener('fullscreenchange', () => {
		if (!isNavigationLocked(timerSession)) return;
		if (!document.fullscreenElement && fullscreenEnforced) {
			pauseActiveSession('Saliste de pantalla completa. El reloj está pausado hasta que vuelvas.', {
				showVeil: true,
				countPause: true,
			});
		} else if (document.fullscreenElement && timerSession.status === 'paused' && vigiliaLockVeil && !vigiliaLockVeil.hidden) {
			void lockEscapeKey();
			resumeActiveSession('vigilia reanudada en pantalla completa');
		}
	});
	window.addEventListener('pagehide', () => {
		if (!isNavigationLocked(timerSession)) return;
		if (timerSession.status === 'running') timerSession = pauseTimerSession(timerSession, Date.now(), { countPause: false });
		persistActiveSession();
	});
	window.addEventListener('popstate', () => {
		if (!isNavigationLocked(timerSession)) return;
		try {
			window.history.pushState({ vigiliaLock: true }, '', window.location.href);
		} catch {}
		announce(`vigilia sellada · faltan <b>${formatTimerClock(getLockedRemainingMs())}</b> — no podés volver atrás`);
	});
	document.addEventListener('click', (e) => {
		if (!isNavigationLocked(timerSession)) return;
		const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
		if (!link || vigiliaSummaryModal?.contains(link)) return;
		e.preventDefault();
		e.stopPropagation();
		openTimerDeck();
		announce(`vigilia sellada · faltan <b>${formatTimerClock(getLockedRemainingMs())}</b> — no podés salir hasta completar`);
	}, true);
	window.addEventListener('beforeunload', (e) => {
		if (!isNavigationLocked(timerSession)) return;
		e.preventDefault();
		// `returnValue` is the legacy string form browsers still honour here.
		(e as unknown as { returnValue: string }).returnValue = '';
	});
}

export function initTimer(): void {
	syncTimerPresetUi();
	syncChimeToggleUi(chimeMuted);

	const restored = parsePersistedTimerSession(readStorage(activeLockKey), bookId);
	if (restored) {
		timerSession = restored;
		fullscreenEnforced = Boolean(document.fullscreenEnabled);
		installHistoryGuard();
		ensureTimerLoop();
		renderTimerUi(timerSession.remainingMs);
		showLockVeil(
			'Recargaste la página con una vigilia activa. El reloj está pausado hasta que retomes.',
			timerSession.remainingMs,
		);
	} else {
		renderTimerUi(0);
	}

	bindTimerControls();
	bindTimerLockGuards();
}

export { closeVigiliaSummary, renderTimerUi, startLockTimer, syncTimerPresetUi };
