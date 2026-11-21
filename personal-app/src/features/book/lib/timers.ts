// Reading lock timer constants, state machine, persistence and clock formatting.

export const TIMER_PRESET_MINUTES = [10, 20, 30, 45] as const;
export const DEFAULT_TIMER_MINUTES = 20;
export const MIN_TIMER_MINUTES = 1;
export const MAX_TIMER_MINUTES = 240;

const MIN_PAUSED_REMAINING_MS = 1_000;

export type ReadingLockTimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type ReadingLockTimer = {
	status: ReadingLockTimerStatus;
	durationMs: number;
	remainingMs: number;
	startedAtMs: number;
	lastTickAtMs: number;
	bookId: number;
	startPage: number;
	startPct: number;
	pauseCount: number;
};

export type TimerSessionMeta = {
	bookId?: number;
	startPage?: number;
	startPct?: number;
};

export type TimerSessionSummary = {
	durationMinutes: number;
	startPage: number;
	endPage: number;
	pagesAdvanced: number;
	startPct: number;
	endPct: number;
	pauseCount: number;
};

function sanitizePage(page: number | undefined): number {
	if (typeof page !== 'number' || !Number.isFinite(page)) return 1;
	return Math.max(1, Math.round(page));
}

function sanitizePct(pct: number | undefined): number {
	if (typeof pct !== 'number' || !Number.isFinite(pct)) return 0;
	return Math.min(100, Math.max(0, Math.round(pct)));
}

function sanitizeBookId(bookId: number | undefined): number {
	if (typeof bookId !== 'number' || !Number.isFinite(bookId)) return 0;
	return Math.max(0, Math.round(bookId));
}

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
		remainingMs: 0,
		startedAtMs: 0,
		lastTickAtMs: 0,
		bookId: 0,
		startPage: 1,
		startPct: 0,
		pauseCount: 0,
	};
}

export function createTimerSession(
	minutes: number,
	nowMs = Date.now(),
	meta?: TimerSessionMeta,
): ReadingLockTimer {
	const safeMinutes = clampTimerMinutes(minutes);
	const durationMs = safeMinutes * 60_000;
	return {
		status: 'running',
		durationMs,
		remainingMs: durationMs,
		startedAtMs: nowMs,
		lastTickAtMs: nowMs,
		bookId: sanitizeBookId(meta?.bookId),
		startPage: sanitizePage(meta?.startPage),
		startPct: sanitizePct(meta?.startPct),
		pauseCount: 0,
	};
}

export function evaluateTimerTick(
	session: ReadingLockTimer,
	nowMs = Date.now(),
): { session: ReadingLockTimer; remainingMs: number; justCompleted: boolean } {
	if (session.status === 'paused') {
		return { session, remainingMs: session.remainingMs, justCompleted: false };
	}
	if (session.status !== 'running') {
		return { session, remainingMs: 0, justCompleted: false };
	}
	const elapsed = Math.max(0, nowMs - session.lastTickAtMs);
	const remainingMs = Math.max(0, session.remainingMs - elapsed);
	const nextTickAt = Math.max(session.lastTickAtMs, nowMs);
	if (remainingMs <= 0) {
		return {
			session: {
				...session,
				status: 'completed',
				remainingMs: 0,
				lastTickAtMs: nextTickAt,
			},
			remainingMs: 0,
			justCompleted: true,
		};
	}
	return {
		session: {
			...session,
			remainingMs,
			lastTickAtMs: nextTickAt,
		},
		remainingMs,
		justCompleted: false,
	};
}

export function pauseTimerSession(
	session: ReadingLockTimer,
	nowMs = Date.now(),
	options?: { countPause?: boolean },
): ReadingLockTimer {
	if (session.status !== 'running') return session;
	const elapsed = Math.max(0, nowMs - session.lastTickAtMs);
	const flushed = session.remainingMs - elapsed;
	const remainingMs =
		session.remainingMs > 0
			? Math.min(session.remainingMs, Math.max(MIN_PAUSED_REMAINING_MS, flushed))
			: 0;
	return {
		...session,
		status: 'paused',
		remainingMs,
		lastTickAtMs: Math.max(session.lastTickAtMs, nowMs),
		pauseCount: session.pauseCount + (options?.countPause === false ? 0 : 1),
	};
}

export function resumeTimerSession(
	session: ReadingLockTimer,
	nowMs = Date.now(),
): ReadingLockTimer {
	if (session.status !== 'paused') return session;
	return {
		...session,
		status: 'running',
		lastTickAtMs: nowMs,
	};
}

export function isNavigationLocked(session: ReadingLockTimer): boolean {
	return session.status === 'running' || session.status === 'paused';
}

export function parseCompletedTimersCount(raw: string | null): number {
	if (!raw) return 0;
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 0) return 0;
	return parsed;
}

export function parseLastTimerMinutes(raw: string | null): number {
	if (!raw) return DEFAULT_TIMER_MINUTES;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return DEFAULT_TIMER_MINUTES;
	return clampTimerMinutes(parsed);
}

export function parseChimeMuted(raw: string | null): boolean {
	return raw === '1' || raw === 'true';
}

export function serializeTimerSession(session: ReadingLockTimer): string | null {
	if (!isNavigationLocked(session) || session.remainingMs <= 0) return null;
	return JSON.stringify(session);
}

export function parsePersistedTimerSession(
	raw: string | null,
	expectedBookId: number,
): ReadingLockTimer | null {
	if (!raw) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== 'object') return null;
	const data = parsed as Partial<ReadingLockTimer>;
	if (data.status !== 'running' && data.status !== 'paused') return null;
	if (typeof data.bookId !== 'number' || !Number.isFinite(data.bookId)) return null;
	if (data.bookId !== expectedBookId) return null;
	if (typeof data.durationMs !== 'number' || !Number.isFinite(data.durationMs) || data.durationMs <= 0) {
		return null;
	}
	if (typeof data.remainingMs !== 'number' || !Number.isFinite(data.remainingMs) || data.remainingMs <= 0) {
		return null;
	}

	const durationMs = Math.round(data.durationMs);
	const remainingMs = Math.min(durationMs, Math.max(1, Math.round(data.remainingMs)));
	const startedAtMs =
		typeof data.startedAtMs === 'number' && Number.isFinite(data.startedAtMs)
			? data.startedAtMs
			: Date.now();
	const lastTickAtMs =
		typeof data.lastTickAtMs === 'number' && Number.isFinite(data.lastTickAtMs)
			? data.lastTickAtMs
			: startedAtMs;
	const pauseCount =
		typeof data.pauseCount === 'number' && Number.isInteger(data.pauseCount) && data.pauseCount >= 0
			? data.pauseCount
			: 0;

	return {
		status: 'paused',
		durationMs,
		remainingMs,
		startedAtMs,
		lastTickAtMs,
		bookId: expectedBookId,
		startPage: sanitizePage(data.startPage),
		startPct: sanitizePct(data.startPct),
		pauseCount,
	};
}

export function buildTimerSummary(
	session: ReadingLockTimer,
	endPage: number,
	endPct: number,
): TimerSessionSummary {
	const safeStartPage = sanitizePage(session.startPage);
	const safeEndPage = sanitizePage(endPage);
	return {
		durationMinutes: Math.max(1, Math.round(session.durationMs / 60_000)),
		startPage: safeStartPage,
		endPage: safeEndPage,
		pagesAdvanced: Math.max(0, safeEndPage - safeStartPage),
		startPct: sanitizePct(session.startPct),
		endPct: sanitizePct(endPct),
		pauseCount: Math.max(0, Math.round(session.pauseCount || 0)),
	};
}
