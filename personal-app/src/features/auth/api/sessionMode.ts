import { getJson } from '../../../shared/api/http';
import type { AuthMode } from '../types';

/**
 * Auth stack the API has mounted, read from its public `/session-mode` endpoint
 * (the browser calls `/api/session-mode`, which the Astro dev server forwards to
 * the API). The backend answers `better` when `AUTH_MODE` is not set — its
 * default — and `dev` while the interim credentials are in place.
 *
 * Like the Better Auth client, this only exists in the browser: the islands are
 * rendered on the server first. The answer is cached in a single request, so a
 * page asks for the mode once no matter how many islands consume it.
 */
let modeRequest: Promise<AuthMode> | undefined;

export function getAuthMode(): Promise<AuthMode> {
	if (typeof window === 'undefined') {
		throw new Error('El modo de autenticación solo está disponible en el navegador.');
	}

	modeRequest ??= readAuthMode();

	return modeRequest;
}

async function readAuthMode(): Promise<AuthMode> {
	try {
		const { mode } = await getJson<{ mode?: AuthMode }>('/session-mode');

		return mode === 'dev' ? 'dev' : 'better';
	} catch {
		// An API without the endpoint (or an unreachable one) keeps the Better
		// Auth flow the panel used before the interim mode.
		return 'better';
	}
}
