import type { ReadingStatus } from '../../entities/book/types';
import { saveBookReadingState } from '../../features/book/api/books';
import { resolveAutoBookStatus } from '../../features/book/lib/reader';
import { body, progPage, saveBtn, saveLabel } from './dom';
import { announce } from './feedback';
import { bookId, state, writeLocalSnapshot } from './state';

// Server-side reading state: auto status transitions and the save button.
const rawBookStatus = body.dataset.bookStatus;
let bookStatus: ReadingStatus | '' =
	rawBookStatus === 'reading' || rawBookStatus === 'finished' || rawBookStatus === 'queued'
		? rawBookStatus
		: '';
let hasStartedBook = false;
let statusSyncPromise: Promise<void> | null = null;
let pendingStatusSync = false;

async function persistReadingState(): Promise<boolean> {
	writeLocalSnapshot();
	const pct = state.progress.pct || 0;
	try {
		await saveBookReadingState(bookId, {
			progress: state.progress,
			marks: state.marks,
			words: state.words,
		});
		const nextStatus = resolveAutoBookStatus(bookStatus, pct, true);
		if (nextStatus) {
			bookStatus = nextStatus;
			body.dataset.bookStatus = nextStatus;
		}
		return true;
	} catch {
		return false;
	}
}

async function syncAutoBookStatus(): Promise<void> {
	const targetStatus = resolveAutoBookStatus(
		bookStatus,
		state.progress.pct || 0,
		hasStartedBook,
	);
	if (!targetStatus) return;

	if (statusSyncPromise) {
		pendingStatusSync = true;
		return;
	}

	statusSyncPromise = (async () => {
		do {
			pendingStatusSync = false;
			const nextTarget = resolveAutoBookStatus(
				bookStatus,
				state.progress.pct || 0,
				hasStartedBook,
			);
			if (!nextTarget) break;

			const saved = await persistReadingState();
			if (!saved) break;

			if (nextTarget === 'finished') {
				announce('lectura completada · marcado automáticamente como <b>Terminado</b>');
			} else if (nextTarget === 'reading') {
				announce('lectura iniciada · marcado automáticamente como <b>Leyendo</b>');
			}
		} while (pendingStatusSync);
	})().finally(() => {
		statusSyncPromise = null;
	});

	await statusSyncPromise;
}


export { persistReadingState, syncAutoBookStatus };

export function isBookStarted(): boolean {
	return hasStartedBook;
}

export function markBookStarted(): void {
	hasStartedBook = true;
}

export function initSaveButton(): void {
	saveBtn?.addEventListener('click', async () => {
		const button = saveBtn;
		if (!button) return;
		const pg = progPage ? progPage.textContent : String(state.progress.page || 1);
		const pct = state.progress.pct || 0;
		const saved = await persistReadingState();
		if (!saved) {
			announce('no se pudo guardar en el servidor · revisá tu sesión de admin');
			return;
		}
		if (saveLabel) saveLabel.textContent = 'Guardado · pág ' + pg;
		button.classList.add('saved');
		announce(`progreso sellado · <b>pág ${pg} · ${pct}%</b> — te espera donde lo dejaste`);
		setTimeout(() => {
			if (saveLabel) saveLabel.textContent = 'Guardar progreso';
			button.classList.remove('saved');
		}, 3000);
	});
}
