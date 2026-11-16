import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/api/serverEnvironment', () => ({
	backendUrl: 'https://render.example',
	neonAuthUrl: 'https://neon-auth.example',
}));

const jsonResponse = (body: unknown, status = 200, headers?: Record<string, string>) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', ...headers },
	});

let fetchStub: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.resetModules();
	fetchStub = vi.fn();
	vi.stubGlobal('fetch', fetchStub);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('getServerAdminAuth', () => {
	it('returns isAdmin=false without hitting the network when cookieHeader is missing', async () => {
		const { getServerAdminAuth } = await import('./serverSession');
		await expect(getServerAdminAuth(null)).resolves.toEqual({ isAdmin: false });
		expect(fetchStub).not.toHaveBeenCalled();
	});

	it('returns bearerToken from set-auth-jwt in neon mode for an admin session', async () => {
		fetchStub
			.mockResolvedValueOnce(jsonResponse({ mode: 'neon' }))
			.mockResolvedValueOnce(
				jsonResponse(
					{ user: { id: '1', email: 'a@b.com', role: 'admin' } },
					200,
					{ 'set-auth-jwt': 'jwt-from-header' },
				),
			);

		const { getServerAdminAuth } = await import('./serverSession');
		await expect(getServerAdminAuth('neon.sid=abc')).resolves.toEqual({
			isAdmin: true,
			bearerToken: 'jwt-from-header',
		});
	});

	it('falls back to /token in neon mode when set-auth-jwt header is absent', async () => {
		fetchStub
			.mockResolvedValueOnce(jsonResponse({ mode: 'neon' }))
			.mockResolvedValueOnce(jsonResponse({ user: { id: '1', email: 'a@b.com', role: 'admin' } }))
			.mockResolvedValueOnce(jsonResponse({ token: 'jwt-from-token-endpoint' }));

		const { getServerAdminAuth } = await import('./serverSession');
		await expect(getServerAdminAuth('neon.sid=abc')).resolves.toEqual({
			isAdmin: true,
			bearerToken: 'jwt-from-token-endpoint',
		});
	});

	it('returns cookie in dev/better mode for an admin session and rejects non-admin', async () => {
		fetchStub
			.mockResolvedValueOnce(jsonResponse({ mode: 'dev' }))
			.mockResolvedValueOnce(jsonResponse({ user: { email: 'a@b.com', role: 'admin' } }));

		const { getServerAdminAuth, hasAdminSession } = await import('./serverSession');
		await expect(getServerAdminAuth('dev.sid=xyz')).resolves.toEqual({
			isAdmin: true,
			cookie: 'dev.sid=xyz',
		});

		fetchStub.mockResolvedValueOnce(jsonResponse({ user: { email: 'u@b.com', role: 'user' } }));
		await expect(hasAdminSession('dev.sid=user')).resolves.toBe(false);
	});
});
