import { createAuthClient } from 'better-auth/solid';

const apiBaseUrl = (import.meta.env.PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

const ABSOLUTE_URL = /^https?:\/\//i;

let authClient: ReturnType<typeof createAuthClient> | undefined;

/**
 * Better Auth client for the admin panel. In dev `PUBLIC_API_BASE_URL` is
 * `/api`, so the browser calls `/api/auth/*` same-origin and the Astro dev
 * server proxies it to the backend (`astro.config.mjs`); Better Auth requires
 * an absolute `baseURL`, so the relative base is resolved against
 * `window.location.origin`. In production the variable holds the absolute API
 * origin (e.g. `https://personal-page-api.onrender.com/api`) and is used
 * as-is — the session then travels cross-site (`BETTER_AUTH_CROSS_SITE` on
 * the backend).
 *
 * The client is created on demand because it only exists in the browser: the
 * islands are rendered on the server first, where there is no origin and no
 * cookie jar.
 */
export function getAuthClient() {
	if (typeof window === 'undefined') {
		throw new Error('El cliente de autenticación solo está disponible en el navegador.');
	}

	const base = ABSOLUTE_URL.test(apiBaseUrl)
		? apiBaseUrl
		: `${window.location.origin}${apiBaseUrl}`;

	authClient ??= createAuthClient({
		baseURL: `${base}/auth`,
		fetchOptions: { credentials: 'include' },
	});

	return authClient;
}
