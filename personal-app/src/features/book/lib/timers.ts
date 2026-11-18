// Reading lock timer constants, state machine and clock formatting.

export const TIMER_PRESET_MINUTES = [10, 20, 30, 45] as const;
export const DEFAULT_TIMER_MINUTES = 20;
export const MIN_TIMER_MINUTES = 1;
export const MAX_TIMER_MINUTES = 240;

export type ReadingLockTimerStatus = 'idle' | 'running' | 'completed' | 'abandoned';

export type ReadingLockTimer = {
	status: ReadingLockTimerStatus;
	durationMs: number;
	startedAtMs: number;
	endsAtMs: number;
};

export function clampTimerMinutes(minutes: number): number {
	if (!Number.isFinite(minutes)) return DEFAULT_TIMER_MINUTES;
	return Math.min(MAX_TIMER_MINUTES, Math.max(MIN_TIMER_MINUTES, Math.round(minutes)));
}

export function formatTimerClock(remainingMs: number): string {
	const safeMs = Number.isFinite(remainingMs) && remainingMs > 0 ? remainingMs : 0;
	const totalSeconds = safeMs === 0 ? 0 : Math.ceil(safeMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const mm = String(minutes).padStart(2, '0');
	const ss = String(seconds).padStart(2, '0');
	if (hours > 0) {
		const hh = String(hours).padStart(2, '0');
		return `${hh}:${mm}:${ss}`;
	}
	return `${mm}:${ss}`;
}

export function createIdleTimerSession(): ReadingLockTimer {
	return {
		status: 'idle',
		durationMs: 0,
		startedAtMs: 0,
		endsAtMs: 0,
	};
}

export function createTimerSession(minutes: number, nowMs = Date.now()): ReadingLockTimer {
	const safeMinutes = clampTimerMinutes(minutes);
	const durationMs = safeMinutes * 60_000;
	return {
		status: 'running',
		durationMs,
		startedAtMs: nowMs,
		endsAtMs: nowMs + durationMs,
	};
}

export function evaluateTimerTick(
	session: ReadingLockTimer,
	nowMs = Date.now(),
): { session: ReadingLockTimer; remainingMs: number; justCompleted: boolean } {
	if (session.status !== 'running') {
		return { session, remainingMs: 0, justCompleted: false };
	}
	const remainingMs = Math.max(0, session.endsAtMs - nowMs);
	if (remainingMs <= 0) {
		return {
			session: { ...session, status: 'completed' },
			remainingMs: 0,
			justCompleted: true,
		};
	}
	return { session, remainingMs, justCompleted: false };
}

export function abandonTimerSession(session: ReadingLockTimer): ReadingLockTimer {
	if (session.status !== 'running') return session;
	return { ...session, status: 'abandoned' };
}

export function isNavigationLocked(session: ReadingLockTimer): boolean {
	return session.status === 'running';
}

export function parseCompletedTimersCount(raw: string | null): number {
	if (!raw) return 0;
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 0) return 0;
	return parsed;
}
