import type { AuthMode } from '../types';

/**
 * Server-side session check for the admin gate (`src/middleware.ts`). It
 * re-implements what the browser does in `sessionMode.ts` + `session.ts`,
 * but on the SSR process: it asks the backend which auth stack is mounted
 * (`/session-mode`) and then forwards the request's `Cookie` header to that
 * stack's session endpoint (`/api/auth/get-session` for Better Auth,
 * `/api/auth/dev-session` for the interim dev mode).
 *
 * The check fails closed: no cookie, unreachable backend, unexpected payload —
 * every case answers «no session», so an anonymous visitor is redirected to
 * the login screen before any admin page renders.
 */

const backendUrl = (import.meta.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Ceiling for each session probe against the backend. */
const SESSION_CHECK_TIMEOUT_MS = 5_000;

/**
 * The backend's `AUTH_MODE` almost never changes; the answer is cached briefly
 * so a page hit does not add a mode round-trip per request. A failure caches
 * the default `better` mode only for the same window.
 */
const AUTH_MODE_TTL_MS = 60_000;

let cachedMode: { mode: AuthMode; at: number } | undefined;

async function readAuthMode(): Promise<AuthMode> {
	const now = Date.now();
	if (cachedMode && now - cachedMode.at < AUTH_MODE_TTL_MS) {
		return cachedMode.mode;
	}

	let mode: AuthMode = 'better';
	try {
		const response = await fetch(`${backendUrl}/session-mode`, {
			signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
		});
		const payload = (await response.json()) as { mode?: AuthMode } | null;
		mode = payload?.mode === 'dev' ? 'dev' : 'better';
	} catch {
		// Unreachable backend: the session probe below fails closed anyway.
	}

	cachedMode = { mode, at: now };

	return mode;
}

/**
 * Whether the given `Cookie` header belongs to a valid admin session. The
 * browser cookie is forwarded verbatim so the backend validates the same
 * signed value it issued.
 */
export async function hasAdminSession(cookieHeader: string | null): Promise<boolean> {
	if (!cookieHeader) {
		return false;
	}

	const sessionUrl =
		(await readAuthMode()) === 'dev'
			? `${backendUrl}/api/auth/dev-session`
			: `${backendUrl}/api/auth/get-session`;

	try {
		const response = await fetch(sessionUrl, {
			headers: { cookie: cookieHeader, 'cache-control': 'no-store' },
			signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
		});
		if (!response.ok) {
			return false;
		}

		// Better Auth answers `null` without a session; the dev stack answers
		// `401`. Any authenticated variant carries a `user` object.
		const data: unknown = await response.json().catch(() => null);

		return typeof data === 'object' && data !== null && 'user' in data;
	} catch {
		return false;
	}
}
