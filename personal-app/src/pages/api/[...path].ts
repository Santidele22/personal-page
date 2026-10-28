import type { APIRoute } from 'astro';
import { backendUrl, neonAuthUrl } from '../../shared/api/serverEnvironment';
import { invalidateContentCache } from '../../shared/api/contentCache';

/**
 * Same-origin API proxy for the deployed SSR server. With Neon Auth configured,
 * `/api/auth/*` goes to `NEON_AUTH_BASE_URL`, keeping its session cookie on the
 * frontend origin; every other route goes to `BACKEND_URL` and drops `/api`.
 * Without that setting the route mirrors the self-hosted development proxy.
 * Request bodies and browser cookies travel verbatim, with bounded body sizes.
 *
 * CORS ownership (CSRF hardening): the upstream may answer with its own CORS
 * headers (`Access-Control-Allow-Origin: *` or a reflected origin, credentials
 * allowed), which this proxy must never echo: they would let any website both
 * read the proxied API with the visitor's session and drive state-changing
 * auth calls (logout CSRF). Every `Access-Control-*` header is stripped from
 * the upstream response and this proxy emits its own policy on `/api/auth/*`
 * only: credentials are reflected back solely for the origins in
 * `ALLOWED_CROSS_ORIGINS` plus the request's own origin (same-origin traffic
 * needs no CORS at all). Auth mutations carrying a foreign `Origin` header are
 * rejected with 403 before they ever reach the upstream; requests without
 * `Origin` (same-origin fetches, plain navigation, legitimate password-reset
 * recovery) keep flowing, as do reads, whose cross-origin abuse the browser
 * blocks on its own once no `Access-Control-Allow-Origin` comes back.
 */

const BETTER_AUTH_PREFIX = '/api/auth';

/**
 * Web origins allowed to call `/api/auth/*` cross-origin with credentials.
 * The request's own origin is always accepted on top of this list.
 */
const ALLOWED_CROSS_ORIGINS: readonly string[] = [
	'https://santi.dev',
	'https://personal-page.ezedelebecq22.workers.dev',
];

/** Methods that change state: when they arrive with a foreign Origin they are
 * refused outright, so no third party can ride the visitor's session. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** CORS headers the upstream may emit. The proxy rewrites the policy, so these
 * are dropped on the way out instead of being forwarded verbatim. */
const UPSTREAM_CORS_HEADERS = new Set([
	'access-control-allow-origin',
	'access-control-allow-credentials',
	'access-control-allow-methods',
	'access-control-allow-headers',
	'access-control-expose-headers',
	'access-control-max-age',
	'access-control-allow-private-network',
]);

const ORIGIN_FORBIDDEN = JSON.stringify({ message: 'Origen no permitido.' });

/** Parses an Origin header; `null` for absent or unparsable values. */
function parseOrigin(originHeader: string | null): string | null {
	if (!originHeader) return null;

	try {
		return new URL(originHeader).origin;
	} catch {
		return null;
	}
}

/** The allowed cross-origin to reflect, or `null` when the header is absent
 * or names an origin outside the allowlist (including the literal `null`). */
function allowedCrossOrigin(originHeader: string | null): string | null {
	const origin = parseOrigin(originHeader);
	return origin && ALLOWED_CROSS_ORIGINS.includes(origin) ? origin : null;
}

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

function upstreamUrl(url: URL): string {
	if (neonAuthUrl && url.pathname.startsWith(BETTER_AUTH_PREFIX)) {
		const authPath = url.pathname.slice(BETTER_AUTH_PREFIX.length);
		return `${neonAuthUrl}${authPath}${url.search}`;
	}

	if (url.pathname.startsWith(BETTER_AUTH_PREFIX)) {
		return `${backendUrl}${url.pathname}${url.search}`;
	}

	return `${backendUrl}${url.pathname.replace(/^\/api/, '')}${url.search}`;
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
	const upstream = upstreamUrl(url);

	const headers = new Headers();
	for (const [key, value] of request.headers) {
		// Hop-by-hop headers describe this single hop (browser → proxy →
		// backend), so they must not travel unchanged through the replacement.
		if (
			[
				'host',
				'connection',
				'content-length',
				'transfer-encoding',
				'upgrade',
				'forwarded',
				'x-forwarded-host',
				'x-forwarded-proto',
				'x-forwarded-port',
			].includes(key.toLowerCase())
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
		// with a duplicated cookie header (issue 38). The CORS policy is owned
		// by this proxy (see the header doc above), never by the upstream.
		if (
			['content-length', 'transfer-encoding', 'connection', 'set-cookie'].includes(key.toLowerCase()) ||
			UPSTREAM_CORS_HEADERS.has(key.toLowerCase())
		) {
			continue;
		}
		echoed.append(key, value);
	}

	for (const cookie of response.headers.getSetCookie?.() ?? []) {
		echoed.append('set-cookie', cookie);
	}

	return new Response(response.body, { status: response.status, headers: echoed });
}

function forbiddenOrigin(): Response {
	return new Response(ORIGIN_FORBIDDEN, { status: 403, headers: { 'Content-Type': 'application/json' } });
}

/**
 * Answers a CORS preflight for `/api/auth/*`. Only allowlisted origins get a
 * permissive 204; anything else is refused with 403 and no CORS headers, which
 * makes the browser block the actual request before it leaves the page.
 * Method and headers are echoed from what the preflight asked for: the origin
 * is already pinned by the allowlist, so reflecting the rest is safe.
 */
function authPreflight(request: Request, crossOrigin: string): Response {
	const headers = new Headers();
	headers.set('Access-Control-Allow-Origin', crossOrigin);
	headers.set('Access-Control-Allow-Credentials', 'true');
	headers.set('Access-Control-Allow-Methods', request.headers.get('access-control-request-method') ?? 'POST');
	const allowHeaders = request.headers.get('access-control-request-headers');
	if (allowHeaders) headers.set('Access-Control-Allow-Headers', allowHeaders);
	headers.set('Access-Control-Max-Age', '7200');
	headers.set('Vary', 'Origin');

	return new Response(null, { status: 204, headers });
}

/** CORS headers reflected on an actual `/api/auth/*` response for an
 * allowlisted cross-origin caller. Same-origin traffic gets none: the browser
 * does not apply CORS to it, and the session cookie travels regardless. */
function applyAuthCors(headers: Headers, crossOrigin: string): void {
	headers.set('Access-Control-Allow-Origin', crossOrigin);
	headers.set('Access-Control-Allow-Credentials', 'true');
	headers.append('Vary', 'Origin');
}

/**
 * Guards `/api/auth/*` before forwarding: refuses browser preflights and
 * state-changing calls that name an origin outside the request's own origin
 * and the allowlist, then lets `forward` run and reflects the CORS policy the
 * proxy owns. Every other route is forwarded untouched (headers CORS from the
 * upstream are always stripped inside `forward`).
 */
async function forwardApi(request: Request, clientAddress?: string): Promise<Response> {
	const url = new URL(request.url);
	if (!url.pathname.startsWith(BETTER_AUTH_PREFIX)) {
		const response = await forward(request, clientAddress);
		// Cache invalidation for admin writes (issue 44): a successful content
		// mutation drops every cached entry in this isolate, so panel edits
		// surface immediately; other isolates refresh at most one TTL later.
		// Auth mutations only change sessions, never content.
		if (MUTATING_METHODS.has(request.method) && response.status < 400) {
			invalidateContentCache();
		}

		return response;
	}

	const originHeader = request.headers.get('origin');
	const crossOrigin = allowedCrossOrigin(originHeader);

	if (request.method === 'OPTIONS' && originHeader && request.headers.get('access-control-request-method')) {
		return crossOrigin ? authPreflight(request, crossOrigin) : forbiddenOrigin();
	}

	if (MUTATING_METHODS.has(request.method) && originHeader) {
		const sameOrigin = parseOrigin(originHeader) === url.origin;
		if (!sameOrigin && !crossOrigin) {
			return forbiddenOrigin();
		}
	}

	const response = await forward(request, clientAddress);
	if (crossOrigin) {
		applyAuthCors(response.headers, crossOrigin);
	}

	return response;
}

// `clientAddress` is the socket address this proxy observed; forwarding it is
// what lets the backend's bounded `trust proxy` report the real visitor IP.
export const GET: APIRoute = (context) => forwardApi(context.request, context.clientAddress);
export const POST: APIRoute = (context) => forwardApi(context.request, context.clientAddress);
export const PUT: APIRoute = (context) => forwardApi(context.request, context.clientAddress);
export const PATCH: APIRoute = (context) => forwardApi(context.request, context.clientAddress);
export const DELETE: APIRoute = (context) => forwardApi(context.request, context.clientAddress);
export const HEAD: APIRoute = (context) => forwardApi(context.request, context.clientAddress);
export const OPTIONS: APIRoute = (context) => forwardApi(context.request, context.clientAddress);
