import { createEffect, onMount } from 'solid-js';
import { loadSession, sessionStatus } from './api/session';
import { LOGIN_PATH } from './paths';

/**
 * Client-side gate for the admin pages: an anonymous visitor is sent to the
 * login screen, carrying the route they asked for so the login island can
 * return them there. It renders nothing; `widgets/admin/AdminSessionGate.astro`
 * mounts it with `client:load` because the redirect has to happen as soon as
 * the page is interactive.
 */
export default function SessionGuard() {
	onMount(() => {
		void loadSession();
	});

	createEffect(() => {
		if (sessionStatus() !== 'anonymous') return;

		const requested = window.location.pathname + window.location.search;
		window.location.replace(`${LOGIN_PATH}?redirect=${encodeURIComponent(requested)}`);
	});

	return null;
}
