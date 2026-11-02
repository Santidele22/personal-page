import { createSignal, For, onMount, Show } from 'solid-js';
import {
	createCertificate,
	deleteCertificate,
	fetchAdminCertificates,
	updateCertificate,
} from './api/certificates-admin';
import type { AdminCertificateRow, CertificateWriteBody } from './api/certificates-admin';

/**
 * Admin CRUD for the `certificates` domain (`/admin/certificados/`): the
 * portfolio section the landing renders from `GET /certificates`. The island
 * reads, creates, edits and deletes through the authorized helpers, and
 * reloads the stored list after every mutation, so the rows it shows always
 * match the API. The optional image travels inside the same multipart request
 * as the fields, so a certificate without one is created and edited fine
 * (S1). The session gate lives in the admin shell (`AdminTopBar` mounts
 * `SessionGuard`), like the other panels.
 */

type Status = 'loading' | 'ready' | 'error';

/** The result of the last action, rendered as a strip above the editor. */
type Feedback =
	| { kind: 'idle' }
	| { kind: 'created' }
	| { kind: 'saved' }
	| { kind: 'deleted' }
	| { kind: 'error'; message: string };

type FormState = {
	title: string;
	description: string;
	/** Link of the platform/institution; `''` means the card shows no link. */
	issuerLink: string;
	/** `YYYY-MM-DD`, the value the date input edits and the API orders by. */
	date: string;
};

const EMPTY_FORM: FormState = { title: '', description: '', issuerLink: '', date: '' };

/** Accepted uploads, the same three the backend verifies by magic bytes. */
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

const labelClass = 'block text-[11px] font-medium tracking-[0.2em] text-muted-foreground';
const inputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const hintClass = 'mt-1.5 text-[11px] leading-relaxed text-muted-foreground';
const cardClass = 'border border-border bg-card p-6';
const primaryButtonClass =
	'inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';
const rowButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';
const dangerButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60';

/** Stored row → editable form, the same mapping the other panels use. */
function toForm(row: AdminCertificateRow): FormState {
	return {
		title: row.title,
		description: row.description,
		issuerLink: row.issuerLink ?? '',
		date: row.date ?? '',
	};
}

/** Form → API body. Empty strings travel as they are: the DTO accepts `''` to clear the link. */
function toBody(form: FormState): CertificateWriteBody {
	return {
		title: form.title.trim(),
		description: form.description.trim(),
		issuerLink: form.issuerLink.trim(),
		date: form.date.trim(),
	};
}

/**
 * Client-side check so the admin gets Spanish copy instead of a raw `400`.
 * The Link keeps the soft policy of the panels: only a full http(s) URL (or
 * empty, because the backend treats `''` as "sin link"), and the API still
 * owns the authoritative answer.
 */
function validate(form: FormState): string | null {
	if (!form.title.trim()) return 'El certificado necesita un título.';
	if (!form.description.trim()) return 'El certificado necesita una descripción.';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) return 'El certificado necesita una fecha.';

	const link = form.issuerLink.trim();
	if (link && !/^https?:\/\/\S+$/i.test(link)) {
		return 'El link del lugar tiene que ser una URL completa (https://…), o vacío si todavía no hay enlace.';
	}

	return null;
}

/**
 * Keeps the Spanish copy and appends the backend detail: a validation failure
 * answers `400 { message }` and hiding it would leave the admin without the
 * reason.
 */
function withDetail(fallback: string, cause: unknown): string {
	const detail = cause instanceof Error ? cause.message.trim() : '';

	return detail ? `${fallback} (${detail})` : fallback;
}

type FieldProps = {
	id: string;
	label: string;
	value: string;
	placeholder?: string;
	hint?: string;
	type?: 'text' | 'date';
	multiline?: boolean;
	rows?: number;
	onInput: (value: string) => void;
};

/** One labelled input/textarea/date, shared by the create form and the row editors. */
function Field(props: FieldProps) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				{props.label}
			</label>
			<Show
				when={props.multiline}
				fallback={
					<input
						id={props.id}
						type={props.type ?? 'text'}
						value={props.value}
						placeholder={props.placeholder}
						onInput={(event) => props.onInput(event.currentTarget.value)}
						class={`${inputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 3}
					value={props.value}
					placeholder={props.placeholder}
					onInput={(event) => props.onInput(event.currentTarget.value)}
					class={`${inputClass} mt-2 resize-y leading-relaxed`}
				/>
			</Show>
			{props.hint && <p class={hintClass}>{props.hint}</p>}
		</div>
	);
}

type FileFieldProps = {
	id: string;
	label: string;
	/** Tells the admin what a replaced or stored image is. */
	hint?: string;
	onSelect: (file: File | null) => void;
};

/** The optional image picker; it only ever hands the panel a `File` or `null`. */
function FileField(props: FileFieldProps) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				{props.label}
			</label>
			<input
				id={props.id}
				type="file"
				accept={IMAGE_ACCEPT}
				onChange={(event) => props.onSelect(event.currentTarget.files?.[0] ?? null)}
				class="mt-2 block max-w-full text-[12px] text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground hover:file:border-aka hover:file:text-aka"
			/>
			{props.hint && <p class={hintClass}>{props.hint}</p>}
		</div>
	);
}

/** The fields of one certificate, shared by the add form and the inline editor. */
function CertificateFields(props: {
	form: FormState;
	prefix: string;
	onInput: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<Field
				id={`${props.prefix}-title`}
				label="TÍTULO"
				value={props.form.title}
				placeholder="Meta Front-End Developer"
				onInput={(value) => props.onInput('title', value)}
			/>
			<Field
				id={`${props.prefix}-date`}
				label="FECHA"
				type="date"
				value={props.form.date}
				hint="La web ordena los certificados por esta fecha, del más reciente al más antiguo."
				onInput={(value) => props.onInput('date', value)}
			/>
			<Field
				id={`${props.prefix}-description`}
				label="DESCRIPCIÓN"
				value={props.form.description}
				multiline
				rows={3}
				onInput={(value) => props.onInput('description', value)}
			/>
			<Field
				id={`${props.prefix}-issuer`}
				label="LINK DEL LUGAR"
				value={props.form.issuerLink}
				placeholder="https://coursera.org"
				hint="La plataforma o institución que lo emitió. Si queda vacío, la tarjeta se muestra sin enlace."
				onInput={(value) => props.onInput('issuerLink', value)}
			/>
		</div>
	);
}

export default function CertificadosEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [rows, setRows] = createSignal<AdminCertificateRow[]>([]);
	const [pending, setPending] = createSignal(false);
	const [feedback, setFeedback] = createSignal<Feedback>({ kind: 'idle' });
	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [newForm, setNewForm] = createSignal<FormState>(EMPTY_FORM);
	const [newImage, setNewImage] = createSignal<File | null>(null);
	const [newImageVersion, setNewImageVersion] = createSignal(1);
	const [draftForm, setDraftForm] = createSignal<FormState>(EMPTY_FORM);
	const [draftImage, setDraftImage] = createSignal<File | null>(null);

	async function load(options: { silent?: boolean } = {}) {
		if (!options.silent) setStatus('loading');

		try {
			setRows(await fetchAdminCertificates());
			setStatus('ready');
		} catch {
			// The API message can be raw (for example `Unauthorized`); the panel
			// answers in Spanish and offers a retry, like the other panels.
			setStatus('error');
		}
	}

	onMount(() => {
		void load();
	});

	function updateNew<K extends keyof FormState>(key: K, value: FormState[K]) {
		setNewForm((current) => ({ ...current, [key]: value }));
	}

	function updateDraft<K extends keyof FormState>(key: K, value: FormState[K]) {
		setDraftForm((current) => ({ ...current, [key]: value }));
	}

	/** Reloads the stored list after the mutation; `true` when it reached the API. */
	async function mutate(action: () => Promise<void>, success: Feedback): Promise<boolean> {
		if (pending()) return false;

		setPending(true);
		setFeedback({ kind: 'idle' });

		try {
			await action();
		} catch (cause) {
			setPending(false);
			setFeedback({ kind: 'error', message: withDetail('No pudimos guardar los cambios.', cause) });
			return false;
		}

		setPending(false);
		setFeedback(success);
		await load({ silent: true });

		return true;
	}

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();

		const current = newForm();
		const problem = validate(current);
		if (problem) {
			setFeedback({ kind: 'error', message: problem });
			return;
		}

		const created = await mutate(
			() => createCertificate(toBody(current), newImage()),
			{ kind: 'created' },
		);

		if (created) {
			setNewForm(EMPTY_FORM);
			setNewImage(null);
			// Remounts the picker so the browser clears the chosen filename.
			setNewImageVersion((version) => version + 1);
		}
	}

	function startEdit(row: AdminCertificateRow) {
		setEditingId(row.id);
		setConfirmingDeleteId(null);
		setDraftForm(toForm(row));
		setDraftImage(null);
		setFeedback({ kind: 'idle' });
	}

	function cancelEdit() {
		setEditingId(null);
		setDraftImage(null);
		setFeedback({ kind: 'idle' });
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();

		const current = draftForm();
		const problem = validate(current);
		if (problem) {
			setFeedback({ kind: 'error', message: problem });
			return;
		}

		const saved = await mutate(
			() => updateCertificate(id, toBody(current), draftImage()),
			{ kind: 'saved' },
		);

		if (saved) {
			setEditingId(null);
			setDraftImage(null);
		}
	}

	async function handleDelete(id: number) {
		const removed = await mutate(() => deleteCertificate(id), { kind: 'deleted' });

		if (!removed) return;

		setConfirmingDeleteId(null);
		if (editingId() === id) setEditingId(null);
	}

	function successText(): string | null {
		switch (feedback().kind) {
			case 'created':
				return 'Certificado añadido. La web ya muestra el cambio.';
			case 'saved':
				return 'Cambios guardados.';
			case 'deleted':
				return 'Certificado eliminado.';
			default:
				return null;
		}
	}

	function errorText(): string | null {
		const current = feedback();

		return current.kind === 'error' ? current.message : null;
	}

	return (
		<div class="flex flex-col gap-8">
			<Show when={status() === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando los certificados…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">No pudimos cargar los certificados. Inténtalo de nuevo en unos minutos.</p>
					<button type="button" onClick={() => void load()} class={`${rowButtonClass} h-10 px-5 text-sm`}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={status() === 'ready'}>
				<Show when={successText()}>
					<p role="status" class="flex items-center gap-2 border border-border bg-card px-5 py-3 text-sm text-foreground">
						<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
						{successText()}
					</p>
				</Show>

				<Show when={errorText()}>
					<p role="alert" class="border border-destructive/40 bg-destructive/10 px-5 py-3 text-sm text-destructive">
						{errorText()}
					</p>
				</Show>

				<section aria-labelledby="certificados-nuevo" class={cardClass}>
					<h2 id="certificados-nuevo" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
						NUEVO CERTIFICADO
					</h2>
					<form onSubmit={handleCreate} class="mt-5 grid gap-5">
						<CertificateFields form={newForm()} prefix="certificate-new" onInput={updateNew} />
						<Show when={newImageVersion()} keyed>
							<FileField
								id="certificate-new-image"
								label="IMAGEN (OPCIONAL)"
								hint="PNG, JPEG o WebP de hasta 5 MB. Si no subís ninguna, la tarjeta se muestra sin imagen."
								onSelect={setNewImage}
							/>
						</Show>
						<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
							<button type="submit" disabled={pending()} class={primaryButtonClass}>
								{pending() ? 'Guardando…' : 'Añadir certificado'}
							</button>
						</div>
					</form>
				</section>

				<section aria-labelledby="certificados-lista" class="flex flex-col gap-4">
					<div class="flex items-baseline justify-between gap-4">
						<h2 id="certificados-lista" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							CERTIFICADOS GUARDADOS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{rows().length} {rows().length === 1 ? 'certificado' : 'certificados'}
						</p>
					</div>

					<Show
						when={rows().length > 0}
						fallback={
							<p class="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
								Todavía no hay certificados guardados: la web muestra el estado vacío de la sección. Añade el primero en
								el formulario de arriba.
							</p>
						}
					>
						<ul class="flex flex-col gap-3">
							<For each={rows()}>
								{(row) => (
									<li class={cardClass}>
										<Show
											when={editingId() === row.id}
											fallback={
												<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
													<div class="min-w-0">
														<p class="truncate font-medium">{row.title}</p>
														<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
															{row.description || 'Sin descripción.'}
														</p>
														<p class="mt-1.5 font-mono text-[12px] text-muted-foreground">
															{row.date} · {row.image ? 'Con imagen' : 'Sin imagen'}
														</p>
														<p class="mt-1 truncate text-[12px] text-muted-foreground">
															{row.issuerLink || 'Sin link del lugar.'}
														</p>
													</div>
													<div class="flex shrink-0 flex-wrap items-center gap-2">
														<Show
															when={confirmingDeleteId() === row.id}
															fallback={
																<>
																	<button type="button" onClick={() => startEdit(row)} class={rowButtonClass}>
																		Editar
																	</button>
																	<button
																		type="button"
																		onClick={() => setConfirmingDeleteId(row.id)}
																		class={dangerButtonClass}
																	>
																		Eliminar
																	</button>
																</>
															}
														>
															<span class="text-[12px] text-muted-foreground">¿Eliminar «{row.title}»?</span>
															<button
																type="button"
																disabled={pending()}
																onClick={() => void handleDelete(row.id)}
																class={dangerButtonClass}
															>
																Sí, eliminar
															</button>
															<button
																type="button"
																onClick={() => setConfirmingDeleteId(null)}
																class={rowButtonClass}
															>
																Cancelar
															</button>
														</Show>
													</div>
												</div>
											}
										>
											<form onSubmit={(event) => void handleEdit(event, row.id)} class="grid gap-5">
												<CertificateFields
													form={draftForm()}
													prefix={`certificate-edit-${row.id}`}
													onInput={updateDraft}
												/>
												<FileField
													id={`certificate-edit-image-${row.id}`}
													label="REEMPLAZAR IMAGEN (OPCIONAL)"
													hint={row.image ? 'Ya hay una imagen cargada: si no elegís otra, se mantiene.' : 'Este certificado no tiene imagen.'}
													onSelect={setDraftImage}
												/>
												<div class="flex flex-wrap items-center gap-2">
													<button type="submit" disabled={pending()} class={primaryButtonClass}>
														{pending() ? 'Guardando…' : 'Guardar cambios'}
													</button>
													<button type="button" onClick={cancelEdit} class={rowButtonClass}>
														Cancelar
													</button>
												</div>
											</form>
										</Show>
									</li>
								)}
							</For>
						</ul>
					</Show>
				</section>
			</Show>
		</div>
	);
}
