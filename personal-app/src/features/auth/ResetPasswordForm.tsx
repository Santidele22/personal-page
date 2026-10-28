import { createSignal, Show } from 'solid-js';
import { getManagedAuthClient } from '../../shared/api/managedAuthClient';
import { LOGIN_PATH } from './paths';

export default function ResetPasswordForm() {
	const token = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('token');
	const [email, setEmail] = createSignal('');
	const [password, setPassword] = createSignal('');
	const [confirmation, setConfirmation] = createSignal('');
	const [pending, setPending] = createSignal(false);
	const [error, setError] = createSignal('');
	const [requested, setRequested] = createSignal(false);
	const [reset, setReset] = createSignal(false);

	async function requestReset(event: SubmitEvent) {
		event.preventDefault();
		if (pending()) return;
		setPending(true);
		setError('');
		try {
			const { error: authError } = await (await getManagedAuthClient()).requestPasswordReset({
				email: email().trim(),
				redirectTo: `${window.location.origin}/admin/recuperar/`,
			});
			if (authError) throw authError;
			setRequested(true);
		} catch {
			setError('No se pudo solicitar la recuperación. Inténtalo de nuevo.');
		} finally {
			setPending(false);
		}
	}

	async function resetPassword(event: SubmitEvent) {
		event.preventDefault();
		if (pending()) return;
		if (password().length < 8) {
			setError('La contraseña debe tener al menos 8 caracteres.');
			return;
		}
		if (password() !== confirmation()) {
			setError('Las contraseñas no coinciden.');
			return;
		}

		setPending(true);
		setError('');
		try {
			const { error: authError } = await (await getManagedAuthClient()).resetPassword({
				newPassword: password(),
				token: token ?? '',
			});
			if (authError) throw authError;
			setReset(true);
		} catch {
			setError('El enlace venció o ya fue utilizado. Solicita uno nuevo.');
		} finally {
			setPending(false);
		}
	}

	return (
		<Show
			when={!reset()}
			fallback={
				<div class="mt-6 flex flex-col gap-4">
					<p role="status" class="rounded-md border border-border bg-background px-4 py-3 text-sm">
						Tu contraseña quedó actualizada.
					</p>
					<a href={LOGIN_PATH} class="text-sm font-medium text-aka underline underline-offset-4">
						Iniciar sesión
					</a>
				</div>
			}
		>
			<Show
				when={token}
				fallback={
					<Show
						when={!requested()}
						fallback={
							<p role="status" class="mt-6 rounded-md border border-border bg-background px-4 py-3 text-sm">
								Si el correo existe, recibirás un enlace para elegir una nueva contraseña.
							</p>
						}
					>
						<form onSubmit={requestReset} class="mt-6 flex flex-col gap-4">
							<div class="flex flex-col gap-2">
								<label for="reset-email" class="text-sm font-medium">Correo electrónico</label>
								<input
									id="reset-email"
									type="email"
									required
									autocomplete="email"
									value={email()}
									onInput={(event) => setEmail(event.currentTarget.value)}
									disabled={pending()}
									class="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none focus:border-aka"
								/>
							</div>
							<button type="submit" disabled={pending()} class="h-11 rounded-md bg-foreground px-6 text-sm font-medium text-background disabled:cursor-wait">
								{pending() ? 'Enviando…' : 'Enviar enlace'}
							</button>
							<Show when={error()}><p role="alert" class="text-sm text-destructive">{error()}</p></Show>
						</form>
					</Show>
				}
			>
				<form onSubmit={resetPassword} class="mt-6 flex flex-col gap-4">
					<div class="flex flex-col gap-2">
						<label for="new-password" class="text-sm font-medium">Nueva contraseña</label>
						<input
							id="new-password"
							type="password"
							required
							minlength="8"
							autocomplete="new-password"
							value={password()}
							onInput={(event) => setPassword(event.currentTarget.value)}
							disabled={pending()}
							class="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none focus:border-aka"
						/>
					</div>
					<div class="flex flex-col gap-2">
						<label for="confirm-password" class="text-sm font-medium">Repetir contraseña</label>
						<input
							id="confirm-password"
							type="password"
							required
							autocomplete="new-password"
							value={confirmation()}
							onInput={(event) => setConfirmation(event.currentTarget.value)}
							disabled={pending()}
							class="h-11 rounded-md border border-input bg-background px-4 text-sm outline-none focus:border-aka"
						/>
					</div>
					<button type="submit" disabled={pending()} class="h-11 rounded-md bg-foreground px-6 text-sm font-medium text-background disabled:cursor-wait">
						{pending() ? 'Guardando…' : 'Guardar contraseña'}
					</button>
					<Show when={error()}><p role="alert" class="text-sm text-destructive">{error()}</p></Show>
				</form>
			</Show>
		</Show>
	);
}
