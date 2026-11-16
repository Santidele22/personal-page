import type { AuthMode } from '../types';
import { isAdminSession } from './adminSession';
import { backendUrl, neonAuthUrl } from '../../../shared/api/serverEnvironment';

/**
 * Server-side session check for the admin gate (`src/middleware.ts`). It
 * re-implements what the browser does in `sessionMode.ts` + `session.ts`,
 * but on the SSR process: it asks the backend which auth stack is mounted
 * (`/session-mode`) and then forwards the request's `Cookie` header to that
 * stack's session endpoint (`/api/auth/get-session` for Better Auth and Neon,
 * `/api/auth/dev-session` for the interim dev mode). Neon is checked directly
 * against NEON_AUTH_BASE_URL so the Worker never re-enters its public proxy.
 *
 * The check fails closed: no cookie, unreachable backend, unexpected payload —
 * every case answers «no session», so an anonymous visitor is redirected to
 * the login screen before any admin page renders.
 */

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
		mode = payload?.mode === 'dev' || payload?.mode === 'neon' ? payload.mode : 'better';
	} catch {
		// Unreachable backend: the session probe below fails closed anyway.
	}

	cachedMode = { mode, at: now };

	return mode;
}

export type ServerAdminAuth =
	| { isAdmin: false }
	| { isAdmin: true; bearerToken?: string; cookie?: string };

async function readNeonToken(cookieHeader: string): Promise<string | undefined> {
	if (!neonAuthUrl) return undefined;
	try {
		const res = await fetch(`${neonAuthUrl}/token`, {
			headers: { cookie: cookieHeader, 'cache-control': 'no-store' },
			signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
		});
		if (!res.ok) return undefined;
		const payload = (await res.json().catch(() => null)) as { token?: unknown } | null;
		return typeof payload?.token === 'string' && payload.token.length > 0 ? payload.token : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Resolves the admin session and the SSR credential needed to read protected
 * backend endpoints (`bearerToken` in Neon mode, `cookie` in Better/Dev mode).
 */
export async function getServerAdminAuth(cookieHeader: string | null): Promise<ServerAdminAuth> {
	if (!cookieHeader) {
		return { isAdmin: false };
	}

	const mode = await readAuthMode();
	const sessionUrl =
		mode === 'dev'
			? `${backendUrl}/api/auth/dev-session`
			: mode === 'neon'
				? `${neonAuthUrl}/get-session`
				: `${backendUrl}/api/auth/get-session`;

	try {
		const response = await fetch(sessionUrl, {
			headers: { cookie: cookieHeader, 'cache-control': 'no-store' },
			signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
		});
		if (!response.ok) {
			return { isAdmin: false };
		}

		// Better Auth answers `null` without a session; the dev stack answers
		// `401`. A valid non-admin session must not enter the panel either.
		const data: unknown = await response.json().catch(() => null);
		if (!isAdminSession(data)) {
			return { isAdmin: false };
		}

		if (mode === 'neon') {
			const headerJwt = response.headers.get('set-auth-jwt');
			const bearerToken =
				typeof headerJwt === 'string' && headerJwt.length > 0
					? headerJwt
					: await readNeonToken(cookieHeader);
			return { isAdmin: true, bearerToken };
		}

		return { isAdmin: true, cookie: cookieHeader };
	} catch {
		return { isAdmin: false };
	}
}

/**
 * Whether the given `Cookie` header belongs to a valid admin session. The
 * browser cookie is forwarded verbatim so the backend validates the same
 * signed value it issued.
 */
export async function hasAdminSession(cookieHeader: string | null): Promise<boolean> {
	return (await getServerAdminAuth(cookieHeader)).isAdmin;
}
