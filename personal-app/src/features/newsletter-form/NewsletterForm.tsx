import { createSignal, Show } from 'solid-js';
import { subscribeNewsletter } from './api/subscribeNewsletter';

type FormStatus = 'idle' | 'pending' | 'success' | 'error';

export default function NewsletterForm() {
	const [email, setEmail] = createSignal('');
	const [status, setStatus] = createSignal<FormStatus>('idle');
	const [error, setError] = createSignal('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (status() === 'pending') return;

		setStatus('pending');
		setError('');
		try {
			await subscribeNewsletter(email().trim());
			setStatus('success');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'No pudimos completar la suscripción.');
			setStatus('error');
		}
	}

	return (
		<div class="mt-6" aria-live="polite">
			<Show
				when={status() === 'success'}
				fallback={
					<>
						<form onSubmit={handleSubmit} class="flex flex-col gap-3 sm:flex-row">
							<label for="newsletter-email" class="sr-only">Tu correo electrónico</label>
							<input
								id="newsletter-email"
								name="email"
								type="email"
								required
								autocomplete="email"
								value={email()}
								onInput={(event) => setEmail(event.currentTarget.value)}
								disabled={status() === 'pending'}
								placeholder="tu@correo.com"
								class="h-11 flex-1 rounded-md border border-input bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus:ring-2 focus:ring-aka/20 disabled:opacity-60"
							/>
							<button
								type="submit"
								disabled={status() === 'pending'}
								class="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-wait disabled:opacity-60"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
									<path d="m22 2-7 20-4-9-9-4Z" />
									<path d="M22 2 11 13" />
								</svg>
								{status() === 'pending' ? 'Enviando…' : 'Apuntarme'}
							</button>
						</form>
						<Show when={status() === 'error'}>
							<p role="alert" class="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">{error()}</p>
						</Show>
					</>
				}
			>
				<p class="flex items-center gap-3 rounded-md border border-aka/40 bg-aka/10 px-4 py-3.5 text-sm text-foreground">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 shrink-0 text-aka" aria-hidden="true">
						<path d="m20 6-11 11-5-5" />
					</svg>
					¡Bienvenida a bordo! Revisa tu correo para confirmar.
				</p>
			</Show>
		</div>
	);
}
