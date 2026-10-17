import { createSignal, Show, onMount } from 'solid-js';
import { getAuthClient } from './api/authClient';
import { clearSession, currentSession, displayName, loadSession, sessionStatus } from './api/session';
import { LOGIN_PATH } from './paths';

/**
 * Sidebar footer of the panel: the signed-in user and the sign-out button.
 * It reads the shared session store, so it asks the API only if no other
 * island on the page did it first.
 */
export default function SidebarSession() {
	const [signingOut, setSigningOut] = createSignal(false);

	onMount(() => {
		void loadSession();
	});

	async function handleSignOut() {
		if (signingOut()) return;

		setSigningOut(true);

		try {
			await getAuthClient().signOut();
		} catch {
			// The session may already be gone: the redirect below still lands
			// the visitor on the login screen.
		}

		clearSession();
		window.location.assign(LOGIN_PATH);
	}

	return (
		<>
			<p class="mt-4 text-[11px] leading-relaxed text-muted-foreground">
				<Show
					when={currentSession()}
					fallback={<span>{sessionStatus() === 'loading' ? 'Comprobando la sesión…' : 'Sesión no verificada'}</span>}
				>
					{(session) => (
						<>
							Sesión de {displayName(session().user)} — {session().user.email}
						</>
					)}
				</Show>
			</p>
			<Show when={sessionStatus() === 'authenticated'}>
				<button
					type="button"
					onClick={handleSignOut}
					disabled={signingOut()}
					class="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-wait disabled:opacity-60"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
						<path d="m16 17 5-5-5-5" />
						<path d="M21 12H9" />
					</svg>
					{signingOut() ? 'Cerrando sesión…' : 'Cerrar sesión'}
				</button>
			</Show>
		</>
	);
}
