const baseUrl = (import.meta.env.PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

const ABSOLUTE_URL = /^https?:\/\//i;

type ErrorPayload = {
	message?: string | string[];
};

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.';
const GENERIC_ERROR = 'El servidor no pudo completar la solicitud.';

/** Extra options for the read helpers. */
export type RequestOptions = {
	/**
	 * Absolute origin used to resolve a relative `PUBLIC_API_BASE_URL` (the
	 * default `/api`) when the request runs outside the browser: server-side
	 * rendering has no `window.location` to resolve `/api` against. Callers
	 * pass `Astro.url.origin`, so the Astro dev server answers the call and its
	 * `/api` proxy forwards it to the backend. The browser ignores it.
	 */
	serverOrigin?: string;
};

/** Builds the request URL, resolving the relative base against `serverOrigin`. */
function resolveUrl(path: string, serverOrigin?: string): string {
	if (ABSOLUTE_URL.test(baseUrl) || !serverOrigin) {
		return `${baseUrl}${path}`;
	}

	return `${serverOrigin.replace(/\/+$/, '')}${baseUrl}${path}`;
}

/**
 * Runs the request and normalises the error shape the API returns. The session
 * cookie travels with every call (`credentials: 'include'`), so the admin views
 * can read the API as the signed-in user.
 */
async function request(path: string, init: RequestInit, options: RequestOptions = {}): Promise<Response> {
	let response: Response;

	try {
		response = await fetch(resolveUrl(path, options.serverOrigin), { credentials: 'include', ...init });
	} catch {
		throw new Error(CONNECTION_ERROR);
	}

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
		const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
		throw new Error(message || GENERIC_ERROR);
	}

	return response;
}

export async function postJson(path: string, body: unknown): Promise<void> {
	await request(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

export async function getJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const response = await request(path, { method: 'GET' }, options);

	return (await response.json()) as T;
}
