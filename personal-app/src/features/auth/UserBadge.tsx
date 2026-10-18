import { onMount } from 'solid-js';
import { currentSession, loadSession, userInitial } from './api/session';

/**
 * Avatar of the top bar: the initial of the signed-in user, with the session
 * email as the tooltip. It replaces the demo owner the panel used to render.
 */
export default function UserBadge() {
	onMount(() => {
		void loadSession();
	});

	const initial = () => {
		const session = currentSession();

		return session ? userInitial(session.user) : '';
	};

	return (
		<span
			class="grid size-9 place-items-center rounded-full bg-foreground font-mincho text-sm font-semibold text-background"
			aria-hidden="true"
			title={currentSession()?.user.email}
		>
			{initial()}
		</span>
	);
}
