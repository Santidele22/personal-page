import { createSignal, Show } from 'solid-js';
import { getAuthClient } from './api/authClient';
import { signInWithDev } from './api/devAuth';
import { refreshSession } from './api/session';
import { getAuthMode } from './api/sessionMode';
import { adminRedirectTarget } from './paths';

const INVALID_CREDENTIALS = 'El correo o la contraseña no son correctos.';
const TOO_MANY_ATTEMPTS = 'Demasiados intentos seguidos. Espera un momento antes de volver a probar.';
const GENERIC_ERROR = 'No se pudo iniciar sesión. Inténtalo de nuevo en unos minutos.';
const CONNECTION_ERROR = 'No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.';

type SignInError = { status?: number } | null | undefined;

function signInErrorMessage(error: SignInError): string {
	if (error?.status === 401) return INVALID_CREDENTIALS;
	if (error?.status === 429) return TOO_MANY_ATTEMPTS;

	return GENERIC_ERROR;
}

/**
 * Login island of the panel. It signs in with the auth stack the API reports —
 * Better Auth email/password, or the interim dev credentials while `AUTH_MODE`
 * is `dev` — and, on success, returns the visitor to the admin route they asked
 * for.
 */
export default function LoginForm() {
	const [email, setEmail] = createSignal('');
	const [password, setPassword] = createSignal('');
	const [error, setError] = createSignal('');
	const [pending, setPending] = createSignal(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (pending()) return;

		setPending(true);
		setError('');

		try {
			const mode = await getAuthMode();
			let authError: SignInError;

			if (mode === 'dev') {
				authError = (await signInWithDev(email().trim(), password())).error;
			} else {
				authError = (
					await getAuthClient().signIn.email({
						email: email().trim(),
						password: password(),
					})
				).error;
			}

			if (authError) {
				setError(signInErrorMessage(authError));
				setPending(false);
				return;
			}

			// The interim dev session lives in the cookie the API just set, so the
			// shared store refreshes before the panel islands mount on the next page
			// (`loadSession` caches its first request).
			if (mode === 'dev') await refreshSession();

			const requested = new URLSearchParams(window.location.search).get('redirect');
			window.location.assign(adminRedirectTarget(requested));
		} catch {
			setError(CONNECTION_ERROR);
			setPending(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} class="mt-6 flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<label for="login-email" class="text-sm font-medium">Correo electrónico</label>
				<input
					id="login-email"
					name="email"
					type="email"
					required
					autocomplete="email"
					value={email()}
					onInput={(event) => setEmail(event.currentTarget.value)}
					disabled={pending()}
					placeholder="tu@correo.com"
					class="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus:ring-2 focus:ring-aka/20 disabled:opacity-60"
				/>
			</div>
			<div class="flex flex-col gap-2">
				<label for="login-password" class="text-sm font-medium">Contraseña</label>
				<input
					id="login-password"
					name="password"
					type="password"
					required
					autocomplete="current-password"
					value={password()}
					onInput={(event) => setPassword(event.currentTarget.value)}
					disabled={pending()}
					class="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus:ring-2 focus:ring-aka/20 disabled:opacity-60"
				/>
			</div>
			<button
				type="submit"
				disabled={pending()}
				class="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-wait disabled:opacity-60"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
					<path d="m10 17 5-5-5-5" />
					<path d="M15 12H3" />
					<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
				</svg>
				{pending() ? 'Entrando…' : 'Entrar'}
			</button>
			<Show when={error()}>
				<p role="alert" class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
					{error()}
				</p>
			</Show>
		</form>
	);
}
