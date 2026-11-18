import type { ReadingMood } from '../../entities/book/types';
import { body, toast } from './dom';

// Toasts and the ambient mood that follows the passage being read.
const moodGlow: Record<ReadingMood, string> = {
	espera: 'rgba(201,62,58,.15)',
	polvo: 'rgba(185,138,68,.14)',
	alerta: 'rgba(201,62,58,.22)',
	niebla: 'rgba(140,150,160,.13)',
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

function announce(html: string) {
	const el = toast;
	if (!el) return;
	el.innerHTML = html;
	el.classList.add('on');
	if (toastTimer) clearTimeout(toastTimer);
	toastTimer = setTimeout(() => el.classList.remove('on'), 2600);
}

let lastMoodSwitchAt = 0;
let pendingMoodCandidate: ReadingMood | null = null;
let pendingMoodHits = 0;

function setMood(key: ReadingMood) {
	const glow = moodGlow[key];
	if (!glow || body.dataset.mood === key) return;
	body.dataset.mood = key;
	body.style.setProperty('--glow', glow);
	lastMoodSwitchAt = Date.now();
}


/**
 * Applies the mood a block asks for, ignoring single-block noise: a mood only
 * takes over after a second consecutive hit, 4.5s of dwelling, or the first
 * switch of the session.
 */

function applyTargetMood(targetMood: ReadingMood) {
	const activeMood = (body.dataset.mood as ReadingMood) || 'espera';

	if (targetMood === activeMood) {
		pendingMoodCandidate = null;
		pendingMoodHits = 0;
	} else {
		if (pendingMoodCandidate === targetMood) {
			pendingMoodHits += 1;
		} else {
			pendingMoodCandidate = targetMood;
			pendingMoodHits = 1;
		}
		const elapsed = Date.now() - lastMoodSwitchAt;
		if (pendingMoodHits >= 2 || elapsed > 4500 || lastMoodSwitchAt === 0) {
			pendingMoodCandidate = null;
			pendingMoodHits = 0;
			setMood(targetMood);
		}
	}
}

export { announce, escapeHtml, setMood, applyTargetMood };
