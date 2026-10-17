import { onMount } from 'solid-js';
import { currentSession, loadSession, sessionStatus } from './api/session';

/**
 * Top bar note of the panel. While the demo data was the only source it read
 * «Datos de demostración — sin conexión a backend»; now it reports the real
 * status of the session the API returned.
 */
export default function TopBarStatus() {
	onMount(() => {
		void loadSession();
	});

	const message = () => {
		const session = currentSession();

		if (session) return `Sesión activa — ${session.user.email}`;
		if (sessionStatus() === 'loading') return 'Comprobando la sesión…';

		return 'Sesión no verificada — redirigiendo al acceso…';
	};

	const dotClass = () => (currentSession() ? 'bg-aka' : 'bg-muted-foreground/50');

	return (
		<p class="flex min-w-0 items-center gap-2.5 text-[13px] text-muted-foreground">
			<span classList={{ 'size-2 shrink-0 rounded-full': true, [dotClass()]: true }} aria-hidden="true"></span>
			<span class="truncate">{message()}</span>
		</p>
	);
}
