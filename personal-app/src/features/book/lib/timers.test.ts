import { describe, expect, it } from 'vitest';

import {
	DEFAULT_TIMER_MINUTES,
	TIMER_PRESET_MINUTES,
	buildTimerSummary,
	clampTimerMinutes,
	createIdleTimerSession,
	createTimerSession,
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
} from './timers';

describe('reading lock timer helpers', () => {
	it('exposes presets, clamps custom minutes and formats clock output', () => {
		expect(TIMER_PRESET_MINUTES).toEqual([10, 20, 30, 45]);
		expect(clampTimerMinutes(0)).toBe(1);
		expect(clampTimerMinutes(500)).toBe(240);
		expect(clampTimerMinutes(Number.NaN)).toBe(DEFAULT_TIMER_MINUTES);
		expect(clampTimerMinutes(17.6)).toBe(18);

		expect(formatTimerClock(25 * 60_000)).toBe('25:00');
		expect(formatTimerClock(61_000)).toBe('01:01');
		expect(formatTimerClock(65 * 60_000)).toBe('01:05:00');
		expect(formatTimerClock(0)).toBe('00:00');
	});

	it('parses storage settings safely (completed count, last minutes, chime mute)', () => {
		expect(parseCompletedTimersCount(null)).toBe(0);
		expect(parseCompletedTimersCount('garbage')).toBe(0);
		expect(parseCompletedTimersCount('-3')).toBe(0);
		expect(parseCompletedTimersCount('7')).toBe(7);

		expect(parseLastTimerMinutes(null)).toBe(DEFAULT_TIMER_MINUTES);
		expect(parseLastTimerMinutes('abc')).toBe(DEFAULT_TIMER_MINUTES);
		expect(parseLastTimerMinutes('0')).toBe(1);
		expect(parseLastTimerMinutes('300')).toBe(240);
		expect(parseLastTimerMinutes('35')).toBe(35);

		expect(parseChimeMuted(null)).toBe(false);
		expect(parseChimeMuted('0')).toBe(false);
		expect(parseChimeMuted('false')).toBe(false);
		expect(parseChimeMuted('1')).toBe(true);
		expect(parseChimeMuted('true')).toBe(true);
	});

	it('creates a running session with metadata, tracks ticks, handles clock skew, and unlocks on completion', () => {
		const idle = createIdleTimerSession();
		expect(idle.status).toBe('idle');
		expect(isNavigationLocked(idle)).toBe(false);

		const session = createTimerSession(10, 1_000, { bookId: 42, startPage: 0, startPct: 140 });
		expect(session.status).toBe('running');
		expect(session.durationMs).toBe(10 * 60_000);
		expect(session.remainingMs).toBe(10 * 60_000);
		expect(session.startedAtMs).toBe(1_000);
		expect(session.lastTickAtMs).toBe(1_000);
		expect(session.bookId).toBe(42);
		expect(session.startPage).toBe(1);
		expect(session.startPct).toBe(100);
		expect(session.pauseCount).toBe(0);
		expect(isNavigationLocked(session)).toBe(true);

		const mid = evaluateTimerTick(session, 1_000 + 4 * 60_000);
		expect(mid.justCompleted).toBe(false);
		expect(mid.remainingMs).toBe(6 * 60_000);
		expect(mid.session.lastTickAtMs).toBe(1_000 + 4 * 60_000);
		expect(isNavigationLocked(mid.session)).toBe(true);

		// Clock skew backwards must not increase remainingMs.
		const skewed = evaluateTimerTick(mid.session, 1_000 + 3 * 60_000);
		expect(skewed.justCompleted).toBe(false);
		expect(skewed.remainingMs).toBe(6 * 60_000);
		expect(skewed.session.remainingMs).toBe(6 * 60_000);

		const done = evaluateTimerTick(mid.session, 1_000 + 10 * 60_000);
		expect(done.justCompleted).toBe(true);
		expect(done.remainingMs).toBe(0);
		expect(done.session.status).toBe('completed');
		expect(isNavigationLocked(done.session)).toBe(false);
	});

	it('pauses and resumes without charging away time or accidentally completing on blur', () => {
		const session = createTimerSession(1, 10_000, { bookId: 7, startPage: 12, startPct: 24 });

		// Pausing flushes elapsed time and counts pause by default.
		const paused = pauseTimerSession(session, 30_000);
		expect(paused.status).toBe('paused');
		expect(paused.remainingMs).toBe(40_000);
		expect(paused.lastTickAtMs).toBe(30_000);
		expect(paused.pauseCount).toBe(1);
		expect(isNavigationLocked(paused)).toBe(true);

		// Ticking while paused does not decrement remainingMs.
		const whilePaused = evaluateTimerTick(paused, 90_000);
		expect(whilePaused.justCompleted).toBe(false);
		expect(whilePaused.remainingMs).toBe(40_000);
		expect(whilePaused.session).toBe(paused);

		// Pausing an already paused, idle, or completed session is a no-op.
		expect(pauseTimerSession(paused, 95_000)).toBe(paused);
		const idle = createIdleTimerSession();
		expect(pauseTimerSession(idle, 95_000)).toBe(idle);

		// Resuming restores running state from resume time without charging away time.
		const resumed = resumeTimerSession(paused, 120_000);
		expect(resumed.status).toBe('running');
		expect(resumed.remainingMs).toBe(40_000);
		expect(resumed.lastTickAtMs).toBe(120_000);
		expect(resumed.pauseCount).toBe(1);

		// Resuming a non-paused session is a no-op.
		expect(resumeTimerSession(resumed, 125_000)).toBe(resumed);

		// Pausing after long elapsed time keeps at least 1_000 ms so blurring cannot complete the session.
		const blurredLate = pauseTimerSession(resumed, 500_000, { countPause: false });
		expect(blurredLate.status).toBe('paused');
		expect(blurredLate.remainingMs).toBe(1_000);
		expect(blurredLate.pauseCount).toBe(1);
	});

	it('serializes active sessions and restores them paused for the matching bookId', () => {
		expect(serializeTimerSession(createIdleTimerSession())).toBeNull();

		const running = createTimerSession(15, 5_000, { bookId: 99, startPage: 4, startPct: 10 });
		const raw = serializeTimerSession(running);
		expect(raw).not.toBeNull();

		const restored = parsePersistedTimerSession(raw, 99);
		expect(restored).not.toBeNull();
		expect(restored?.status).toBe('paused');
		expect(restored?.remainingMs).toBe(15 * 60_000);
		expect(restored?.bookId).toBe(99);
		expect(restored?.startPage).toBe(4);
		expect(restored?.startPct).toBe(10);

		expect(parsePersistedTimerSession(raw, 100)).toBeNull();
		expect(parsePersistedTimerSession(null, 99)).toBeNull();
		expect(parsePersistedTimerSession('{bad json', 99)).toBeNull();
		expect(
			parsePersistedTimerSession(
				JSON.stringify({ ...running, remainingMs: 0 }),
				99,
			),
		).toBeNull();
		expect(
			parsePersistedTimerSession(
				JSON.stringify({ ...running, durationMs: 0 }),
				99,
			),
		).toBeNull();

		const completed = evaluateTimerTick(running, 5_000 + 15 * 60_000).session;
		expect(serializeTimerSession(completed)).toBeNull();
	});

	it('builds completion summary with non-negative pagesAdvanced', () => {
		const session = createTimerSession(25, 1_000, { bookId: 3, startPage: 10, startPct: 20 });
		const paused = pauseTimerSession(session, 11_000);

		const summary = buildTimerSummary(paused, 18, 36);
		expect(summary).toEqual({
			durationMinutes: 25,
			startPage: 10,
			endPage: 18,
			pagesAdvanced: 8,
			startPct: 20,
			endPct: 36,
			pauseCount: 1,
		});

		const backward = buildTimerSummary(paused, 7, 15);
		expect(backward.pagesAdvanced).toBe(0);
	});
});
