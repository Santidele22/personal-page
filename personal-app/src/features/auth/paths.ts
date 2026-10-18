/** Login screen of the panel: the session gate and the logout land here. */
export const LOGIN_PATH = '/admin/login/';

/** Landing page after a successful sign-in. */
export const ADMIN_HOME = '/admin/';

/**
 * Resolves the `redirect` query parameter used after a sign-in. Only routes
 * inside the panel are honoured, so the parameter can never turn the login
 * screen into an open redirect.
 */
export function adminRedirectTarget(requested: string | null | undefined): string {
	if (!requested) return ADMIN_HOME;

	return requested === '/admin' || requested.startsWith('/admin/') ? requested : ADMIN_HOME;
}
