import { defineMiddleware } from 'astro:middleware';
import { hasAdminSession } from './features/auth/api/serverSession';
import { LOGIN_PATH } from './features/auth/paths';

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
 * redirect above and the `/api/*` proxy responses. The CSP only pins
 * `frame-ancestors` (clickjacking); a full strict CSP would break Astro's
 * inline hydration scripts, so that one stays a documented follow-up.
 */

const ADMIN_PREFIX = '/admin';

/** Admin routes an anonymous visitor may see; everything else under `/admin` is gated. */
const PUBLIC_ADMIN_ROUTES = new Set(['/admin/login', LOGIN_PATH]);

function isProtectedAdminRoute(pathname: string): boolean {
	const isAdmin = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

	return isAdmin && !PUBLIC_ADMIN_ROUTES.has(pathname);
}

function applySecurityHeaders(headers: Headers): void {
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	headers.set('Content-Security-Policy', "frame-ancestors 'none'");
}

export const onRequest = defineMiddleware(async (context, next) => {
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
		response = await next();
	}

	applySecurityHeaders(response.headers);

	return response;
});
