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
	 * Fallback origin for non-Workers SSR. On Cloudflare, server reads go
	 * directly to BACKEND_URL so they do not re-enter the public Worker; the
	 * browser keeps using the same-origin `/api` proxy.
	 */
	serverOrigin?: string;
	/** JWT for cross-origin API calls when Managed Neon Auth is active. */
	bearerToken?: string;
};

/** Builds the request URL, resolving the relative base against `serverOrigin`. */
function resolveUrl(path: string, serverOrigin?: string): string {
	if (ABSOLUTE_URL.test(baseUrl) || !serverOrigin) {
		return `${baseUrl}${path}`;
	}

	return `${serverOrigin.replace(/\/+$/, '')}${baseUrl}${path}`;
}

/**
 * Runs the request and normalises the error shape the API returns. Self-hosted
 * modes use cookies; managed mode can add a bearer token through the options.
 */
async function request(path: string, init: RequestInit, options: RequestOptions = {}): Promise<Response> {
	let response: Response;

	try {
		const headers = new Headers(init.headers);
		if (options.bearerToken) headers.set('Authorization', `Bearer ${options.bearerToken}`);
		let url = resolveUrl(path, options.serverOrigin);
		if (import.meta.env.SSR && !ABSOLUTE_URL.test(baseUrl)) {
			const { backendUrl } = await import('./serverEnvironment');
			url = `${backendUrl}${path}`;
		}
		response = await fetch(url, {
			credentials: 'include',
			...init,
			headers,
		});
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

export async function postJson(path: string, body: unknown, options: RequestOptions = {}): Promise<void> {
	await request(
		path,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		},
		options,
	);
}

export async function putJson(path: string, body: unknown, options: RequestOptions = {}): Promise<void> {
	await request(
		path,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		},
		options,
	);
}

export async function patchJson(path: string, body: unknown, options: RequestOptions = {}): Promise<void> {
	await request(
		path,
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		},
		options,
	);
}

export async function deleteJson(path: string, options: RequestOptions = {}): Promise<void> {
	await request(path, { method: 'DELETE' }, options);
}

export async function getJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const response = await request(path, { method: 'GET' }, options);

	return (await response.json()) as T;
}
