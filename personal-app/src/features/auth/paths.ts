/** Login screen of the panel: the session gate and the logout land here. */
export const LOGIN_PATH = '/admin/login/';

/** Landing page after a successful sign-in. */
export const ADMIN_HOME = '/admin/';

const ADMIN_PREFIX = '/admin';
const PUBLIC_ADMIN_ROUTES = new Set([
	'/admin/login',
	LOGIN_PATH,
	'/admin/recuperar',
	'/admin/recuperar/',
]);

export function isAdminSecurityScope(pathname: string): boolean {
	return pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
}

export function isProtectedAdminRoute(pathname: string): boolean {
	const isAdminPath = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
	return isAdminPath && !PUBLIC_ADMIN_ROUTES.has(pathname);
}

/**
 * Resolves the `redirect` query parameter used after a sign-in. Only routes
 * inside the panel are honoured, so the parameter can never turn the login
 * screen into an open redirect.
 */
export function adminRedirectTarget(requested: string | null | undefined): string {
	if (!requested || !requested.startsWith('/') || requested.startsWith('//') || requested.includes('\\')) {
		return ADMIN_HOME;
	}

	const pathname = requested.split(/[?#]/, 1)[0] ?? '';
	if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
		return requested;
	}

	return ADMIN_HOME;
}
