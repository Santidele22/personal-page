import { getJson, postJson } from '../../../shared/api/http';
import type { AuthSession, DevSessionSnapshot } from '../types';

/**
 * Message Nest answers with when the interim credentials do not match. The
 * shared `postJson` helper throws the API message instead of the status, so the
 * message of this single-account login is the signal: a wrong email or password
 * is the only `Unauthorized` it can answer.
 */
const DEV_UNAUTHORIZED = 'Unauthorized';

/** Result shape of the dev sign-in, mirroring the Better Auth client's `error`. */
export type DevSignInResult = { error: { status: number } | null };

/**
 * Signs in against the interim dev API (`AUTH_MODE=dev`). The API sets the
 * signed, HttpOnly session cookie; `credentials: 'include'` is already part of
 * the shared helpers.
 */
export async function signInWithDev(
	email: string,
	password: string,
): Promise<DevSignInResult> {
	try {
		await postJson('/auth/dev-login', { email, password });

		return { error: null };
	} catch (error) {
		if (error instanceof Error && error.message === DEV_UNAUTHORIZED) {
			return { error: { status: 401 } };
		}

		throw error;
	}
}

/** Session snapshot of the interim dev API; `null` when there is no session. */
export async function readDevSession(): Promise<AuthSession | null> {
	try {
		const snapshot = await getJson<DevSessionSnapshot>('/auth/dev-session');

		return { user: snapshot.user };
	} catch {
		return null;
	}
}

/** Expires the interim dev session cookie. */
export async function signOutWithDev(): Promise<void> {
	await postJson('/auth/dev-logout', {});
}
