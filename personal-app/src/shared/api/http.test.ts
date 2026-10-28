import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateContentCache } from './contentCache';
import { getJson } from './http';

/**
 * The cache gate lives in `getJson` (issue 44, spec S7): every reachable
 * backend read that is GET + SSR + public loses its duplicates; sessions,
 * admin/bearer reads and browser traffic keep flowing live.
 */

vi.mock('./serverEnvironment', () => ({ backendUrl: 'https://render.example', neonAuthUrl: undefined }));

const jsonResponse = (body: unknown) =>
	new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

let fetchStub: ReturnType<typeof vi.fn>;

beforeEach(() => {
	fetchStub = vi.fn(() => Promise.resolve(jsonResponse({ ok: 1 })));
	vi.stubGlobal('fetch', fetchStub);
	invalidateContentCache();
	import.meta.env.SSR = true;
});

afterEach(() => {
	vi.unstubAllGlobals();
	import.meta.env.SSR = false;
});

describe('getJson — SSR direct reads share one backend call', () => {
	it('reads /profile once even when several widgets ask for it', async () => {
		const first = await getJson('/profile');
		const second = await getJson('/profile');

		expect(fetchStub).toHaveBeenCalledTimes(1);
		expect(fetchStub.mock.calls[0][0]).toBe('https://render.example/profile');
		expect(second).toEqual(first);
	});

	it('keeps different endpoints in different cache entries', async () => {
		await getJson('/profile');
		await getJson('/blogs');

		expect(fetchStub).toHaveBeenCalledTimes(2);
	});
});

describe('getJson — reads that must never be cached (spec S7)', () => {
	it('browser (non-SSR) reads hit the backend twice', async () => {
		import.meta.env.SSR = false;

		await getJson('/profile');
		await getJson('/profile');

		expect(fetchStub).toHaveBeenCalledTimes(2);
	});

	it('bearer-token reads bypass the cache', async () => {
		await getJson('/profile', { bearerToken: 'jwt' });
		await getJson('/profile', { bearerToken: 'jwt' });

		expect(fetchStub).toHaveBeenCalledTimes(2);
	});

	it('drafts are fetched fresh on every read', async () => {
		await getJson('/blogs/drafts');
		await getJson('/blogs/drafts');

		expect(fetchStub).toHaveBeenCalledTimes(2);
	});
});

describe('getJson — failures keep the current fallback contract (spec S8)', () => {
	it('rethrows when the cold read fails and nothing was cached', async () => {
		fetchStub.mockImplementationOnce(() => Promise.reject(new TypeError('render down')));

		await expect(getJson('/profile')).rejects.toThrow();
	});
});
