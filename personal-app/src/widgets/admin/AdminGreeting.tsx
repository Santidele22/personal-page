import { onMount, Show } from 'solid-js';
import { currentSession, displayName, loadSession } from '../../features/auth/api/session';

/**
 * Personal greeting of the resumen page. The session only exists in the browser
 * (it travels in the Better Auth cookie), so the island renders a neutral
 * greeting on the server and the signed-in name once the shared session store
 * resolves.
 */
export default function AdminGreeting() {
	onMount(() => {
		void loadSession();
	});

	return (
		<Show when={currentSession()} fallback={<>Buenas.</>}>
			{(session) => <>Buenas, {displayName(session().user)}.</>}
		</Show>
	);
}
