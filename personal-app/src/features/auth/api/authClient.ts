import { createAuthClient } from 'better-auth/solid';

const apiBaseUrl = (import.meta.env.PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

let authClient: ReturnType<typeof createAuthClient> | undefined;

/**
 * Better Auth client for the admin panel. It talks to the API over the same
 * origin: `PUBLIC_API_BASE_URL` is `/api` by default, so the browser calls
 * `/api/auth/*` and the Astro dev server proxies `/api` to the backend
 * (`astro.config.mjs`). Better Auth requires an absolute `baseURL`, so the
 * relative base is resolved against `window.location.origin`, which yields the
 * same `/api/auth` URL the spec asks for.
 *
 * The client is created on demand because it only exists in the browser: the
 * islands are rendered on the server first, where there is no origin and no
 * cookie jar.
 */
export function getAuthClient() {
	if (typeof window === 'undefined') {
		throw new Error('El cliente de autenticación solo está disponible en el navegador.');
	}

	authClient ??= createAuthClient({
		baseURL: `${window.location.origin}${apiBaseUrl}/auth`,
		fetchOptions: { credentials: 'include' },
	});

	return authClient;
}
