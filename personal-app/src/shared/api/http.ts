const baseUrl = (import.meta.env.PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');

type ErrorPayload = {
	message?: string | string[];
};

export async function postJson(path: string, body: unknown): Promise<void> {
	let response: Response;

	try {
		response = await fetch(`${baseUrl}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
	} catch {
		throw new Error('No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.');
	}

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
		const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
		throw new Error(message || 'El servidor no pudo completar la solicitud.');
	}
}
