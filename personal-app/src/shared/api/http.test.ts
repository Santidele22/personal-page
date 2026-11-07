import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateContentCache } from './contentCache';
import { getJson, postJsonReturning, resolveApiUrl } from './http';

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

	it('bounds SSR reads so a sleeping backend cannot hang the page render', async () => {
		await getJson('/profile');

		expect(fetchStub.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
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

describe('postJsonReturning — POST with a body to read back', () => {
	it('returns the created resource body so the editor can navigate to it', async () => {
		fetchStub.mockImplementationOnce(() =>
			Promise.resolve(jsonResponse({ id: 42, title: 'nueva' }))
		);

		const created = await postJsonReturning<{ id: number; title: string }>('/blogs', {
			title: 'nueva',
			description: 'desc',
			content: 'cuerpo',
		});

		expect(fetchStub.mock.calls[0][0]).toBe('https://render.example/blogs');
		expect(fetchStub.mock.calls[0][1].method).toBe('POST');
		expect(JSON.parse(fetchStub.mock.calls[0][1].body).title).toBe('nueva');
		expect(created.id).toBe(42);
	});

	it('rethrows the API message verbatim', async () => {
		fetchStub.mockImplementationOnce(() =>
			Promise.resolve(
				new Response(JSON.stringify({ message: 'Blog slug "x" is already taken' }), {
					status: 409,
					headers: { 'Content-Type': 'application/json' },
				})
			)
		);

		await expect(postJsonReturning('/blogs', {})).rejects.toThrow('Blog slug "x" is already taken');
	});
});

describe('resolveApiUrl — the raw URL multipart callers reuse', () => {
	it('resolves against the backend inside SSR and the same-origin proxy in the browser', async () => {
		import.meta.env.SSR = true;
		await expect(resolveApiUrl('/blogs/images')).resolves.toBe('https://render.example/blogs/images');

		import.meta.env.SSR = false;
		await expect(resolveApiUrl('/blogs/images')).resolves.toBe('/api/blogs/images');
	});
});
