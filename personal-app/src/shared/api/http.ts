const baseUrl = (import.meta.env.PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

type ErrorPayload = {
	message?: string | string[];
};

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.';
const GENERIC_ERROR = 'El servidor no pudo completar la solicitud.';

/**
 * Runs the request and normalises the error shape the API returns. The session
 * cookie travels with every call (`credentials: 'include'`), so the admin views
 * can read the API as the signed-in user.
 */
async function request(path: string, init: RequestInit): Promise<Response> {
	let response: Response;

	try {
		response = await fetch(`${baseUrl}${path}`, { credentials: 'include', ...init });
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

export async function getJson<T>(path: string): Promise<T> {
	const response = await request(path, { method: 'GET' });

	return (await response.json()) as T;
}
