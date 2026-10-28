import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cachedEntryCount, cachedRead, invalidateContentCache } from '../../shared/api/contentCache';

/**
 * The `/api` proxy owns cache invalidation for admin writes (issue 44, spec
 * S6): every successful mutating call on a content route drops the cached
 * entries, so panel edits surface on the same isolate immediately; auth
 * mutations never touch content.
 */

// The proxy talks to `BACKEND_URL` (a Cloudflare-only import); the unit tests
// replace it so no virtual workers module is needed.
vi.mock('../../shared/api/serverEnvironment', () => ({ backendUrl: 'https://render.example', neonAuthUrl: undefined }));

const ok = () => Promise.resolve(new Response('{"ok":true}', { status: 200 }));
const notFound = () => Promise.resolve(new Response('{"message":"nope"}', { status: 404 }));

let fetchStub: ReturnType<typeof vi.fn>;

beforeEach(() => {
	fetchStub = vi.fn(ok);
	vi.stubGlobal('fetch', fetchStub);
	invalidateContentCache();
});

// Minimal APIRoute context the proxy handlers really use: request + clientAddress.
async function call(origin: string, pathname: string, method: string, upstream = ok) {
	fetchStub = vi.fn(upstream);
	vi.stubGlobal('fetch', fetchStub);
	const handlers = (await import('./[...path]')) as unknown as {
		[key: string]: (context: unknown) => Promise<Response>;
	};

	const handler = handlers[method];
	expect(handler, `proxy exports ${method}`).toBeDefined();

	const response = await handler({
		request: new Request(`${origin}${pathname}`, { method }),
		clientAddress: undefined,
	});

	return response;
}

describe('proxy mutations invalidate the content cache', () => {
	it('drops cached entries after a successful content mutation', async () => {
		await call('https://site.example', '/api/profile', 'POST');

		await cachedRead('https://render.example/profile', async () => '{"name":"cached"}');
		expect(cachedEntryCount()).toBe(1);

		await call('https://site.example', '/api/profile', 'PUT');

		expect(cachedEntryCount()).toBe(0);
	});

	it('keeps the cache when the mutation did not succeed', async () => {
		await cachedRead('https://render.example/profile', async () => '{"name":"cached"}');

		await call('https://site.example', '/api/profile', 'PUT', notFound);

		expect(cachedEntryCount()).toBe(1);
	});

	it('never invalidates through auth mutations (sessions are not content)', async () => {
		await cachedRead('https://render.example/profile', async () => '{"name":"cached"}');

		await call('https://site.example', '/api/auth/sign-out', 'POST');

		expect(cachedEntryCount()).toBe(1);
	});
});
