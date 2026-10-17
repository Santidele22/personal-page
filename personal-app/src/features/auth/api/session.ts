import { createSignal } from 'solid-js';
import type { AuthSession, AuthSessionStatus, AuthUser } from '../types';
import { getAuthClient } from './authClient';

/**
 * Session store shared by every admin island. The islands that make up the
 * shell (gate, sidebar, topbar) read the same signals, and `loadSession()`
 * keeps a single in-flight request, so a page asks the API for the session
 * once no matter how many islands consume it.
 */
const [status, setStatus] = createSignal<AuthSessionStatus>('loading');
const [session, setSession] = createSignal<AuthSession | null>(null);
let pending: Promise<void> | undefined;

export function sessionStatus(): AuthSessionStatus {
	return status();
}

export function currentSession(): AuthSession | null {
	return session();
}

export function loadSession(): Promise<void> {
	pending ??= readSession();

	return pending;
}

export function refreshSession(): Promise<void> {
	pending = undefined;

	return loadSession();
}

/** Drops the local session state after a sign-out, before the redirect. */
export function clearSession(): void {
	pending = undefined;
	setSession(null);
	setStatus('anonymous');
}

/** Name the panel greets the user with: first name, then full name, then email. */
export function displayName(user: AuthUser): string {
	const firstName = user.firstName?.trim();

	if (firstName) return firstName;

	const name = user.name?.trim();

	return name || user.email;
}

export function userInitial(user: AuthUser): string {
	return displayName(user).charAt(0).toUpperCase();
}

async function readSession(): Promise<void> {
	try {
		const { data } = await getAuthClient().getSession();
		const next = data as AuthSession | null;

		setSession(next);
		setStatus(next ? 'authenticated' : 'anonymous');
	} catch {
		// No session (or no backend): the gate treats both as anonymous.
		setSession(null);
		setStatus('anonymous');
	}
}
