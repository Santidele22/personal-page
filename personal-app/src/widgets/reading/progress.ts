import { body, progPage, progPct, progSummary, progTotalPages } from './dom';
import { getPdfPages, state, writeLocalSnapshot } from './state';
import { isBookStarted, syncAutoBookStatus } from './status';

// Progress readout: page, percentage, wire and the aria summary.

export function updateProgressDisplay(page: number, pct: number, chunkId?: string) {
	const cleanPage = Math.min(getPdfPages(), Math.max(1, Number(page) || 1));
	const cleanPct = Math.min(100, Math.max(0, Math.round(Number(pct) || 0)));
	state.progress = { page: cleanPage, pct: cleanPct, chunkId };
	if (progPage) progPage.textContent = String(cleanPage);
	if (progTotalPages && body.dataset.readingLoaded === '1') {
		progTotalPages.textContent = String(getPdfPages());
	}
	if (progPct) progPct.textContent = cleanPct + '%';
	body.style.setProperty('--prog-pct', cleanPct + '%');
	if (progSummary) {
		progSummary.setAttribute(
			'aria-label',
			`Progreso de lectura: página ${cleanPage} de ${getPdfPages()}, ${cleanPct} por ciento`,
		);
	}
	writeLocalSnapshot();
	if (isBookStarted() && cleanPct >= 100) {
		void syncAutoBookStatus();
	}
}
