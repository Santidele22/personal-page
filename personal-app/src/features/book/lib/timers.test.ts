import { describe, expect, it } from 'vitest';

import {
	TIMER_PRESET_MINUTES,
	abandonTimerSession,
	clampTimerMinutes,
	createTimerSession,
	evaluateTimerTick,
	formatTimerClock,
	isNavigationLocked,
	parseCompletedTimersCount,
} from './timers';

describe('reading lock timer helpers', () => {
	it('exposes presets, clamps custom minutes and formats clock output', () => {
		expect(TIMER_PRESET_MINUTES).toEqual([10, 20, 30, 45]);
		expect(clampTimerMinutes(0)).toBe(1);
		expect(clampTimerMinutes(500)).toBe(240);
		expect(clampTimerMinutes(Number.NaN)).toBe(20);
		expect(clampTimerMinutes(17.6)).toBe(18);

		expect(formatTimerClock(25 * 60_000)).toBe('25:00');
		expect(formatTimerClock(61_000)).toBe('01:01');
		expect(formatTimerClock(65 * 60_000)).toBe('01:05:00');
		expect(formatTimerClock(0)).toBe('00:00');
	});

	it('locks navigation while running and unlocks upon completion or confirmed abandonment', () => {
		const session = createTimerSession(10, 1_000);
		expect(isNavigationLocked(session)).toBe(true);
		expect(session.endsAtMs).toBe(1_000 + 10 * 60_000);

		const mid = evaluateTimerTick(session, 1_000 + 4 * 60_000);
		expect(mid.justCompleted).toBe(false);
		expect(mid.remainingMs).toBe(6 * 60_000);
		expect(isNavigationLocked(mid.session)).toBe(true);

		const done = evaluateTimerTick(mid.session, session.endsAtMs);
		expect(done.justCompleted).toBe(true);
		expect(done.remainingMs).toBe(0);
		expect(done.session.status).toBe('completed');
		expect(isNavigationLocked(done.session)).toBe(false);

		const abandoned = abandonTimerSession(createTimerSession(15, 2_000));
		expect(abandoned.status).toBe('abandoned');
		expect(isNavigationLocked(abandoned)).toBe(false);
	});

	it('parses completed timers count safely from storage', () => {
		expect(parseCompletedTimersCount(null)).toBe(0);
		expect(parseCompletedTimersCount('garbage')).toBe(0);
		expect(parseCompletedTimersCount('-3')).toBe(0);
		expect(parseCompletedTimersCount('7')).toBe(7);
	});
});
