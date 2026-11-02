import { describe, expect, it } from 'vitest';
import { isAdminSession } from './adminSession';

describe('isAdminSession', () => {
	it('accepts a session whose user is admin', () => {
		expect(isAdminSession({ user: { email: 'admin@example.com', role: 'admin' } })).toBe(true);
	});

	it.each([
		['a generic authenticated role', { user: { email: 'user@example.com', role: 'authenticated' } }],
		['a missing role', { user: { email: 'user@example.com' } }],
		['a missing user', { session: { id: 'session-1' } }],
		['a null session', null],
	])('rejects %s', (_label, session) => {
		expect(isAdminSession(session)).toBe(false);
	});
});
