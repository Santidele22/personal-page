import {
	buildTimerSummary,
	formatTimerClock,
	isNavigationLocked,
	type ReadingLockTimer,
} from '../../features/book/lib/reader';
import { closeAllDecks } from './decks';
import {
	body,
	bottomBackLink,
	timerBarFill,
	timerBtn,
	timerBtnDot,
	timerBtnLabel,
	timerChimeToggle,
	timerClockDisplay,
	timerCustomMinutes,
	timerPauseNote,
	timerRunningView,
	timerSetupView,
	timerStatsNote,
	timerStatusBadge,
	topBackLink,
	topTimerClock,
	topTimerPill,
	vigiliaLockVeil,
	vigiliaResumeBtn,
	vigiliaSummaryContinueBtn,
	vigiliaSummaryDuration,
	vigiliaSummaryModal,
	vigiliaSummaryPages,
	vigiliaSummaryPauses,
	vigiliaSummaryProgress,
	vigiliaSummarySaveStatus,
	vigiliaVeilClock,
	vigiliaVeilReason,
} from './dom';
import { state } from './state';
import { persistReadingState } from './status';
import { setZen, syncFullscreenButton } from './zen';

// DOM synchronization for the timed vigilia deck, blocking lock veil and
// completion summary modal.

export function syncTimerStatsUi(completedTimersCount: number): void {
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

export function syncChimeToggleUi(chimeMuted: boolean): void {
	if (!timerChimeToggle) return;
	const active = !chimeMuted;
	timerChimeToggle.setAttribute('aria-pressed', String(active));
	timerChimeToggle.textContent = active ? 'Activa' : 'Silenciada';
}

export function syncTimerPresetUi(selectedTimerMinutes: number, syncInput = true): void {
	document.querySelectorAll<HTMLButtonElement>('[data-timer-preset]').forEach((btn) => {
		const val = Number(btn.dataset.timerPreset || 0);
		btn.setAttribute('aria-pressed', String(val === selectedTimerMinutes));
	});
	const input = timerCustomMinutes;
	if (syncInput && input && Number(input.value) !== selectedTimerMinutes) {
		input.value = String(selectedTimerMinutes);
	}
}

export function syncNavigationLockUi(locked: boolean): void {
	[topBackLink, bottomBackLink].forEach((link) => {
		if (!link) return;
		link.classList.toggle('is-locked', locked);
		if (locked) {
			link.setAttribute('aria-disabled', 'true');
			link.setAttribute('tabindex', '-1');
		} else {
			link.removeAttribute('aria-disabled');
			link.removeAttribute('tabindex');
		}
	});
}

export function renderTimerView(
	session: ReadingLockTimer,
	remainingMs: number,
	completedTimersCount: number,
	chimeMuted: boolean,
): void {
	const locked = isNavigationLocked(session);
	const paused = session.status === 'paused';
	const running = session.status === 'running';
	body.dataset.vigiliaLocked = locked ? 'on' : 'off';
	syncNavigationLockUi(locked);
	syncFullscreenButton();

	const clock = formatTimerClock(locked ? remainingMs : 0);

	if (timerSetupView) timerSetupView.hidden = locked;
	if (timerRunningView) timerRunningView.hidden = !locked;
	if (topTimerPill) topTimerPill.hidden = !locked;
	if (timerBtnDot) timerBtnDot.hidden = !locked;

	topTimerPill?.classList.toggle('is-paused', paused);
	timerBtn?.classList.toggle('is-running', running);
	timerBtn?.classList.toggle('is-paused', paused);

	if (locked) {
		if (topTimerClock) topTimerClock.textContent = clock;
		if (timerClockDisplay) timerClockDisplay.textContent = clock;
		if (vigiliaVeilClock) vigiliaVeilClock.textContent = clock;
		if (timerBtnLabel) timerBtnLabel.textContent = paused ? `Pausa · ${clock}` : clock;
		if (timerStatusBadge) {
			timerStatusBadge.textContent = paused ? 'En pausa' : 'En curso';
			timerStatusBadge.classList.toggle('is-paused', paused);
		}
		if (timerPauseNote) {
			if (session.pauseCount > 0) {
				timerPauseNote.hidden = false;
				timerPauseNote.textContent =
					session.pauseCount === 1
						? '1 pausa registrada al salir'
						: `${session.pauseCount} pausas registradas al salir`;
			} else {
				timerPauseNote.hidden = true;
			}
		}
		if (timerBarFill && session.durationMs > 0) {
			const elapsedPct = Math.min(
				100,
				Math.max(0, ((session.durationMs - remainingMs) / session.durationMs) * 100),
			);
			timerBarFill.style.width = `${elapsedPct.toFixed(1)}%`;
		}
	} else {
		if (timerBtnLabel) timerBtnLabel.textContent = 'Vigilia';
		if (timerBarFill) timerBarFill.style.width = '0%';
		if (timerStatusBadge) {
			timerStatusBadge.textContent = 'En curso';
			timerStatusBadge.classList.remove('is-paused');
		}
		if (timerPauseNote) timerPauseNote.hidden = true;
	}
	syncTimerStatsUi(completedTimersCount);
	syncChimeToggleUi(chimeMuted);
}

export function showLockVeil(reason: string, remainingMs: number): void {
	if (!vigiliaLockVeil) return;
	if (vigiliaVeilReason) vigiliaVeilReason.textContent = reason;
	if (vigiliaVeilClock) vigiliaVeilClock.textContent = formatTimerClock(remainingMs);
	closeAllDecks();
	vigiliaLockVeil.hidden = false;
	setZen(false);
	vigiliaResumeBtn?.focus();
}

export function hideLockVeil(): void {
	if (vigiliaLockVeil) vigiliaLockVeil.hidden = true;
}

export function openCompletionSummaryModal(session: ReadingLockTimer): void {
	if (!vigiliaSummaryModal) return;
	const endPage = state.progress.page || 1;
	const endPct = state.progress.pct || 0;
	const summary = buildTimerSummary(session, endPage, endPct);

	if (vigiliaSummaryDuration) vigiliaSummaryDuration.textContent = `${summary.durationMinutes} min`;
	if (vigiliaSummaryPages) {
		vigiliaSummaryPages.textContent =
			summary.pagesAdvanced > 0
				? `+${summary.pagesAdvanced} (pág ${summary.startPage} → ${summary.endPage})`
				: `pág ${summary.endPage}`;
	}
	if (vigiliaSummaryProgress) {
		vigiliaSummaryProgress.textContent =
			summary.endPct !== summary.startPct
				? `${summary.startPct}% → ${summary.endPct}%`
				: `${summary.endPct}%`;
	}
	if (vigiliaSummaryPauses) {
		if (summary.pauseCount > 0) {
			vigiliaSummaryPauses.hidden = false;
			vigiliaSummaryPauses.textContent =
				summary.pauseCount === 1
					? '1 pausa registrada al salir'
					: `${summary.pauseCount} pausas registradas al salir`;
		} else {
			vigiliaSummaryPauses.hidden = true;
		}
	}
	if (vigiliaSummarySaveStatus) {
		vigiliaSummarySaveStatus.textContent = 'Guardando progreso…';
		vigiliaSummarySaveStatus.classList.remove('is-saved', 'is-warn');
	}

	vigiliaSummaryModal.hidden = false;
	setZen(false);
	vigiliaSummaryContinueBtn?.focus();

	void persistReadingState().then((saved) => {
		if (!vigiliaSummarySaveStatus) return;
		if (saved) {
			vigiliaSummarySaveStatus.textContent = `Progreso guardado · pág ${summary.endPage} (${summary.endPct}%)`;
			vigiliaSummarySaveStatus.classList.add('is-saved');
		} else {
			vigiliaSummarySaveStatus.textContent =
				'Progreso guardado localmente · no se pudo sincronizar con el servidor';
			vigiliaSummarySaveStatus.classList.add('is-warn');
		}
	});
}

export function hideCompletionSummaryModal(): void {
	if (vigiliaSummaryModal) vigiliaSummaryModal.hidden = true;
}
