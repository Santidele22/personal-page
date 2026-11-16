import { defineMiddleware } from 'astro:middleware';
import { hasAdminSession } from './features/auth/api/serverSession';
import { LOGIN_PATH } from './features/auth/paths';
import { setEdgeCacheStore, setWaitUntil } from './shared/api/contentCache';
import { contentCacheKv } from './shared/api/serverEnvironment';

/**
 * Server-side middleware of the whole site.
 *
 * Admin gate (issue 38): the panel pages render on demand (`output: 'server'`,
 * no `prerender` on them), so this runs before any of them renders. Every
 * `/admin/*` route except the login screen needs a session the backend
 * validates: the request's `Cookie` header is forwarded to the auth stack the
 * API reports and, when no session comes back, the visitor gets a 302 to the
 * login screen — the panel HTML never renders for an anonymous visitor. The
 * client-side `SessionGuard` stays as defence in depth (it also handles
 * session expiry mid-navigation).
 *
 * Security headers: applied to every response the app produces, including the
 * redirect above and the `/api/*` proxy responses. HSTS joins them on HTTPS
 * responses only.
 *
 * CSP ownership (issue 41): Astro's native `security.csp` renders the full
 * policy, with hashes for every inline script/style it generates, as a
 * `Content-Security-Policy` header on each SSR response. This middleware only
 * appends the one directive Astro deliberately leaves out: `frame-ancestors`
 * (clickjacking), because browsers ignore it inside a `<meta>` element. It is
 * appended as a second policy rather than overwritten, so both stay in force;
 * multiple policies intersect only on directives they both define. Never append
 * another `script-src`/`style-src` here: those would intersect with Astro's
 * hashes and block the framework's own inline code. Admin is the one exception
 * that edits Astro's existing `script-src` in place: Better Auth compiles its
 * schemas with `new Function`, so the login and panel need `'unsafe-eval'`.
 * Keeping that exception on `/admin` leaves the public site's policy unchanged.
 */

/** Same palette the Astro pages compile to (see `global.css`). */
const PAGE_BG = '#f4efe4';
const PAGE_FG = '#23201a';
const PAGE_MUTED = '#6f6657';
const PAGE_AKA = '#c73e3a';

/**
 * The waking page a public render failure answers with. Minimal on purpose:
 * no islands, no backend reads, nothing that could itself fail while the
 * stack the page just apologised for is waking. Self-contained inline HTML
 * (not a `.astro` page) so it never re-enters the rendering pipeline that
 * just threw; the CSS stands in for the site's palette without touching the
 * Astro-generated CSP hashing, which only applies to pipeline-rendered pages.
 */
function wakingPage(pathname: string): Response {
	const escapedPath = pathname.replace(/[&<>"']/g, (ch) =>
		({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
	);
	const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<meta http-equiv="refresh" content="30" />
<title>El sitio se está despertando</title>
<style>
:root { color-scheme: light; }
body {
  margin: 0;
  background: ${PAGE_BG};
  color: ${PAGE_FG};
  font-family: system-ui, sans-serif;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
}
main { max-width: 34rem; }
p.eyebrow {
  display: flex; align-items: center; gap: .75rem;
  margin: 0 0 1rem;
  font-size: .8rem; font-weight: 500; letter-spacing: .25em;
  color: ${PAGE_MUTED};
}
span.rule { display: inline-block; width: 2.5rem; height: 1px; background: ${PAGE_AKA}; }
h1 { margin: 0 0 1rem; font-size: 1.9rem; line-height: 1.2; }
p { margin: 0 0 .5rem; line-height: 1.6; }
p.note { color: ${PAGE_MUTED}; font-size: .9rem; }
</style>
</head>
<body>
<main>
<p class="eyebrow"><span class="rule"></span>ERROR 503</p>
<h1>El sitio se está despertando</h1>
<p>${escapedPath} está bien, pero el servidor todavía está encendiendo. Recargá en un minuto y vas a ver la página completa.</p>
<p class="note">La página se recarga sola en 30 segundos, o podés hacerlo vos.</p>
</main>
</body>
</html>`;

	return new Response(html, {
		status: 503,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Retry-After': '60',
			'Cache-Control': 'no-store',
		},
	});
}

const ADMIN_PREFIX = '/admin';

/** Admin routes an anonymous visitor may see; everything else under `/admin` is gated. */
const PUBLIC_ADMIN_ROUTES = new Set(['/admin/login', LOGIN_PATH, '/admin/recuperar', '/admin/recuperar/']);

function isProtectedAdminRoute(pathname: string): boolean {
	const isAdmin = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

	return isAdmin && !PUBLIC_ADMIN_ROUTES.has(pathname);
}

function applySecurityHeaders(headers: Headers, isHttps: boolean, isAdmin: boolean): void {
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	if (isAdmin) {
		const csp = headers.get('Content-Security-Policy');
		if (csp) headers.set('Content-Security-Policy', csp.replaceAll('script-src ', "script-src 'unsafe-eval' "));
	}

	headers.append('Content-Security-Policy', "frame-ancestors 'none'");
	// HSTS only makes sense (and only sticks) on HTTPS responses; the dev
	// server serves plain HTTP and must not pin localhost.
	if (isHttps) {
		headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
}

export const onRequest = defineMiddleware(async (context, next) => {
	// The content cache (issue 44) hands background revalidations to the
	// Worker's `waitUntil`, so a stale read can refresh a backend entry after
	// the response already left. No runtime (local dev) simply runs them
	// fire-and-forget; the sink is reset every request since it belongs to
	// this single request's lifetime.
const runtime = (
	context.locals as unknown as {
		cfContext?: { waitUntil?: (promise: Promise<unknown>) => void };
		runtime?: { ctx?: { waitUntil?: (promise: Promise<unknown>) => void } };
	}
);

// The Cloudflare adapter exposes the worker context as `cfContext` (Astro 7);
// `runtime.ctx` was the pre-v6 shape and is kept as fallback for older adapters.
// The method is invoked with its owner as `this`: both the Workers runtime and
// the local polyfill throw «Illegal invocation» on a detached waitUntil, which
// would turn every stale revalidation into a 500.
const waitUntilOwner = runtime.cfContext?.waitUntil ? runtime.cfContext : runtime.runtime?.ctx?.waitUntil ? runtime.runtime.ctx : undefined;
	setWaitUntil(waitUntilOwner?.waitUntil ? (promise) => waitUntilOwner.waitUntil!(promise) : undefined);
	setEdgeCacheStore(contentCacheKv);

	let response: Response;

	if (isProtectedAdminRoute(context.url.pathname)) {
		const session = await hasAdminSession(context.request.headers.get('cookie'));

		if (!session) {
			// Same contract the client-side SessionGuard uses: carry the route
			// so the login island can send the visitor back after signing in.
			// The Location stays root-relative: the Node adapter builds the
			// request origin from its configured port (not the Host header), so
			// an absolute URL would point at the wrong host behind a proxy.
			const redirect = context.url.pathname + context.url.search;
			response = new Response(null, {
				status: 302,
				headers: { Location: `${LOGIN_PATH}?redirect=${encodeURIComponent(redirect)}` },
			});
		} else {
			response = await next();
		}
	} else {
		try {
			response = await next();
		} catch (error) {
			// Cold-start net: a sleeping free-tier backend (Render spin-down,
			// Neon compute suspend) can surface as a render-time failure even
			// though every loader degrades to its fallback — the exception
			// then produced the runtime's raw «500» the browser renders as a
			// bare error page. Public pages instead answer a branded 503 with
			// `Retry-After`: the visitor reloads once the stack wakes, and the
			// status stays truthful (recovery is automatic, no client bug).
			// Panel errors are re-thrown unchanged: an admin edit failing
			// silently behind «try again» would hide the real bug.
			console.error(`[middleware] render failed for ${context.url.pathname}`, error);
			response = wakingPage(context.url.pathname);
		}
	}

	const isAdmin = context.url.pathname === ADMIN_PREFIX || context.url.pathname.startsWith(`${ADMIN_PREFIX}/`);
	applySecurityHeaders(response.headers, context.url.protocol === 'https:', isAdmin);

	return response;
});
