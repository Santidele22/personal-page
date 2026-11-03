import { createSignal, createUniqueId } from 'solid-js';
import { projectPurchaseMailto } from './api/purchase';

const inputClass =
	'mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export default function ProjectPurchaseDialog(props: { projectName: string }) {
	let dialog: HTMLDialogElement | undefined;
	const titleId = createUniqueId();
	const [name, setName] = createSignal('');
	const [email, setEmail] = createSignal('');
	const [message, setMessage] = createSignal('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		window.location.href = projectPurchaseMailto(props.projectName, {
			name: name().trim(),
			email: email().trim(),
			message: message().trim(),
		});
		dialog?.close();
	}

	return (
		<>
			<button
				type="button"
				onClick={() => dialog?.showModal()}
				class="inline-flex items-center gap-1.5 text-sm font-medium text-aka hover:underline"
			>
				Comprar
			</button>
			<dialog
				ref={dialog}
				aria-labelledby={titleId}
				onClick={(event) => event.target === dialog && dialog.close()}
				class="m-auto w-[calc(100%-2rem)] max-w-lg border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60"
			>
				<form onSubmit={handleSubmit} class="p-6 sm:p-8">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">CONTACTO DE COMPRA</p>
							<h2 id={titleId} class="mt-2 font-mincho text-2xl font-semibold">Comprar {props.projectName}</h2>
						</div>
						<button type="button" onClick={() => dialog?.close()} aria-label="Cerrar" class="text-xl text-muted-foreground hover:text-aka">×</button>
					</div>
					<p class="mt-4 text-sm leading-relaxed text-muted-foreground">Contame qué necesitás. Al continuar se abrirá tu aplicación de correo con el mensaje preparado.</p>
					<div class="mt-5 grid gap-4">
						<label class="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">
							NOMBRE
							<input required autocomplete="name" value={name()} onInput={(event) => setName(event.currentTarget.value)} class={inputClass} />
						</label>
						<label class="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">
							TU EMAIL
							<input required type="email" autocomplete="email" value={email()} onInput={(event) => setEmail(event.currentTarget.value)} class={inputClass} />
						</label>
						<label class="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">
							MENSAJE
							<textarea required rows={4} value={message()} onInput={(event) => setMessage(event.currentTarget.value)} class={`${inputClass} resize-y`} />
						</label>
					</div>
					<button type="submit" class="mt-6 inline-flex h-11 items-center justify-center bg-foreground px-5 text-sm font-medium text-background hover:bg-aka hover:text-[#fdf8ee]">
						Preparar email
					</button>
				</form>
			</dialog>
		</>
	);
}
