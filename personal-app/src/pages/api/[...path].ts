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

/** The proxy answers requests at runtime, never at build time. */
export const prerender = false;

/** Rewrites a browser `/api/...` path into the backend's upstream path. */
function upstreamPath(pathname: string): string {
	if (pathname.startsWith(BETTER_AUTH_PREFIX)) {
		return pathname;
	}

	return pathname.replace(/^\/api/, '');
}

/** Forwards one request to the backend and echoes its response. */
async function forward(request: Request): Promise<Response> {
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

	const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

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
		if (['content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
			continue;
		}
		echoed.append(key, value);
	}

	for (const cookie of response.headers.getSetCookie?.() ?? []) {
		echoed.append('set-cookie', cookie);
	}

	return new Response(response.body, { status: response.status, headers: echoed });
}

export const GET: APIRoute = (context) => forward(context.request);
export const POST: APIRoute = (context) => forward(context.request);
export const PUT: APIRoute = (context) => forward(context.request);
export const PATCH: APIRoute = (context) => forward(context.request);
export const DELETE: APIRoute = (context) => forward(context.request);
export const HEAD: APIRoute = (context) => forward(context.request);
