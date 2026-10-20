import type { APIRoute } from 'astro';

/**
 * Same-origin API proxy used by the production Node server. In `astro dev`
 * the Vite `server.proxy` forwards `/api/...` to the Nest backend on port
 * 3000; on the built server (`node dist/server/entry.mjs`) there is no proxy,
 * so this catch-all route forwards the call instead. The rule mirrors the
 * dev config: Better Auth keeps its real `/api/auth/*` mount (with its exact
 * prefix) while every domain route drops the `/api` prefix, because the
 * backend mounts plain domain paths (`/profile`, `/tools`, …).
 *
 * The request body travels verbatim (admin writes), and the browser cookie is
 * forwarded so the guarded admin routes answer through the proxy.
 * `BACKEND_URL` selects the upstream origin (`http://localhost:3000` by
 * default, the same-box deployment).
 */

const backendUrl = (import.meta.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

const BETTER_AUTH_PREFIX = '/api/auth';

/**
 * Body caps for the forwarded requests (issue 38). JSON admin writes are tiny
 * compared to these; the multipart PDF upload of a book
 * (`POST /api/books/:id/file`) is the one large body the site expects.
 */
const DEFAULT_BODY_LIMIT = 1_048_576; // 1 MiB
const BOOK_FILE_BODY_LIMIT = 62_914_560; // 60 MiB
const BOOK_FILE_ROUTE = /^\/api\/books\/[^/]+\/file$/;

/** The proxy answers requests at runtime, never at build time. */
export const prerender = false;

/** Rewrites a browser `/api/...` path into the backend's upstream path. */
function upstreamPath(pathname: string): string {
	if (pathname.startsWith(BETTER_AUTH_PREFIX)) {
		return pathname;
	}

	return pathname.replace(/^\/api/, '');
}

function bodyLimitFor(pathname: string, method: string): number {
	return method === 'POST' && BOOK_FILE_ROUTE.test(pathname) ? BOOK_FILE_BODY_LIMIT : DEFAULT_BODY_LIMIT;
}

const PAYLOAD_TOO_LARGE = JSON.stringify({
	message: 'El cuerpo de la petición supera el límite permitido.',
});

/**
 * Reads the request body up to `limit` bytes. Answers `'too-large'` when the
 * declared `Content-Length` (if honest) or the actual stream crosses the cap,
 * so a chunked upload cannot bypass the limit by omitting the header.
 */
async function readBody(request: Request, limit: number): Promise<ArrayBuffer | 'too-large' | undefined> {
	if (['GET', 'HEAD'].includes(request.method)) {
		return undefined;
	}

	const declared = Number(request.headers.get('content-length') ?? '0');
	if (Number.isFinite(declared) && declared > limit) {
		return 'too-large';
	}

	if (!request.body) {
		return undefined;
	}

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;

	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;

			size += value.byteLength;
			if (size > limit) {
				await reader.cancel();
				return 'too-large';
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return body.buffer;
}

/** Forwards one request to the backend and echoes its response. */
async function forward(request: Request, clientAddress?: string): Promise<Response> {
	const url = new URL(request.url);
	const upstream = `${backendUrl}${upstreamPath(url.pathname)}${url.search}`;

	const headers = new Headers();
	for (const [key, value] of request.headers) {
		// Hop-by-hop headers describe this single hop (browser → proxy →
		// backend), so they must not travel unchanged through the replacement.
		if (
			['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade'].includes(
				key.toLowerCase(),
			)
		) {
			continue;
		}
		headers.set(key, value);
	}

	// x-forwarded-for records the hop this proxy observes. The backend trusts
	// exactly one proxy hop (its `trust proxy` setting), so the address it
	// reports as `req.ip` — the real visitor — is the last entry here, the one
	// this proxy appends after whatever the client claimed (issue 38).
	if (clientAddress) {
		const claimed = headers.get('x-forwarded-for')?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? [];
		headers.set('x-forwarded-for', [...claimed, clientAddress].join(', '));
	}

	const body = await readBody(request, bodyLimitFor(url.pathname, request.method));
	if (body === 'too-large') {
		return new Response(PAYLOAD_TOO_LARGE, { status: 413, headers: { 'Content-Type': 'application/json' } });
	}

	let response: Response;
	try {
		response = await fetch(upstream, { method: request.method, headers, body });
	} catch {
		return new Response(
			JSON.stringify({ message: 'No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.' }),
			{ status: 502, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const echoed = new Headers();
	for (const [key, value] of response.headers) {
		// `set-cookie` is copied once below via `getSetCookie()`: the plain
		// iteration already yields it (combined), so copying both ways answers
		// with a duplicated cookie header (issue 38).
		if (['content-length', 'transfer-encoding', 'connection', 'set-cookie'].includes(key.toLowerCase())) {
			continue;
		}
		echoed.append(key, value);
	}

	for (const cookie of response.headers.getSetCookie?.() ?? []) {
		echoed.append('set-cookie', cookie);
	}

	return new Response(response.body, { status: response.status, headers: echoed });
}

// `clientAddress` is the socket address this proxy observed; forwarding it is
// what lets the backend's bounded `trust proxy` report the real visitor IP.
export const GET: APIRoute = (context) => forward(context.request, context.clientAddress);
export const POST: APIRoute = (context) => forward(context.request, context.clientAddress);
export const PUT: APIRoute = (context) => forward(context.request, context.clientAddress);
export const PATCH: APIRoute = (context) => forward(context.request, context.clientAddress);
export const DELETE: APIRoute = (context) => forward(context.request, context.clientAddress);
export const HEAD: APIRoute = (context) => forward(context.request, context.clientAddress);
