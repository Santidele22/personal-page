import { createSignal, For, onMount, Show } from 'solid-js';
import {
	createRecommendation,
	deleteRecommendation,
	fetchAdminRecommendations,
	updateRecommendation,
} from './api/recommendations-admin';
import type { AdminRecommendationRow, RecommendationWriteBody } from './api/recommendations-admin';

/**
 * Admin CRUD for the `recommendations` domain (`/admin/recomendaciones/`):
 * the LinkedIn recommendations the home renders from `GET /recommendations`.
 * The island reads, creates, edits and deletes through the authorized JSON
 * helpers, and reloads the stored list after every mutation, so the rows it
 * shows always match the API order (`position`, ties by id). The session gate
 * lives in the admin shell (`AdminTopBar` mounts `SessionGuard`), like the
 * other panels.
 */

type Status = 'loading' | 'ready' | 'error';

/** The result of the last action, rendered as a strip above the editor. */
type Feedback =
	| { kind: 'idle' }
	| { kind: 'created' }
	| { kind: 'saved' }
	| { kind: 'deleted' }
	| { kind: 'error'; message: string };

/**
 * A typed position: a number sends it, `null` means "the admin left it blank"
 * (the backend decides the placement) and `invalid` is a non-integer the
 * panel refuses to guess about.
 */
type Position = number | null | 'invalid';

type FormState = {
	quote: string;
	authorName: string;
	authorRole: string;
	relationship: string;
	linkedinUrl: string;
	/** Raw input text; parsed with `readPosition` before it travels. */
	position: string;
};

const EMPTY_FORM: FormState = {
	quote: '',
	authorName: '',
	authorRole: '',
	relationship: '',
	linkedinUrl: '',
	position: '',
};

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
function toForm(row: AdminRecommendationRow): FormState {
	return {
		quote: row.quote,
		authorName: row.authorName,
		authorRole: row.authorRole,
		relationship: row.relationship,
		linkedinUrl: row.linkedinUrl ?? '',
		position: String(row.position),
	};
}

/** Form → API body. Empty strings travel as they are: the DTO accepts `''` to clear the link. */
function toBody(form: FormState): RecommendationWriteBody {
	const position = readPosition(form.position);
	const body: RecommendationWriteBody = {
		quote: form.quote.trim(),
		authorName: form.authorName.trim(),
		authorRole: form.authorRole.trim(),
		relationship: form.relationship.trim(),
		linkedinUrl: form.linkedinUrl.trim(),
	};
	if (position !== null && position !== 'invalid') body.position = position;

	return body;
}

/** Reads the position input: blank stays blank, bad text is refused. */
function readPosition(value: string): Position {
	const trimmed = value.trim();

	if (!trimmed) return null;

	const parsed = Number(trimmed);

	return Number.isInteger(parsed) && parsed >= 0 ? parsed : 'invalid';
}

/**
 * Client-side check so the admin gets Spanish copy instead of a raw `400`.
 * The link keeps the DTO policy exactly (`^$|^https?://\S+$`): only a full
 * http(s) URL or empty, and the API still owns the authoritative answer.
 */
function validate(form: FormState): string | null {
	if (!form.quote.trim()) return 'La recomendación necesita el texto de la cita.';
	if (!form.authorName.trim()) return 'La recomendación necesita el nombre de quien la firma.';
	if (!form.authorRole.trim()) return 'La recomendación necesita el rol de quien la firma.';
	if (!form.relationship.trim()) return 'La recomendación necesita la relación (por ejemplo, «Me supervisó directamente»).';

	const link = form.linkedinUrl.trim();
	if (link && !/^https?:\/\/\S+$/i.test(link)) {
		return 'El link de LinkedIn tiene que ser una URL completa (https://…), o vacío si todavía no hay enlace.';
	}

	if (readPosition(form.position) === 'invalid') {
		return 'La posición tiene que ser un número entero igual o mayor que cero.';
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
	type?: 'text' | 'number';
	multiline?: boolean;
	rows?: number;
	onInput: (value: string) => void;
};

/** One labelled input/textarea, shared by the create form and the row editors. */
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
						min={props.type === 'number' ? 0 : undefined}
						step={props.type === 'number' ? 1 : undefined}
						value={props.value}
						placeholder={props.placeholder}
						onInput={(event) => props.onInput(event.currentTarget.value)}
						class={`${inputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 4}
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

/** The fields of one recommendation, shared by the add form and the inline editor. */
function RecommendationFields(props: {
	form: FormState;
	prefix: string;
	onInput: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<Field
					id={`${props.prefix}-quote`}
					label="CITA"
					value={props.form.quote}
					multiline
					rows={4}
					placeholder="Tengo la oportunidad de trabajar con Santiago…"
					onInput={(value) => props.onInput('quote', value)}
				/>
			</div>
			<Field
				id={`${props.prefix}-author`}
				label="NOMBRE"
				value={props.form.authorName}
				placeholder="Carlos Fabian Lencina"
				onInput={(value) => props.onInput('authorName', value)}
			/>
			<Field
				id={`${props.prefix}-role`}
				label="ROL"
				value={props.form.authorRole}
				placeholder="CTO | Blockchain & AI Engineer"
				onInput={(value) => props.onInput('authorRole', value)}
			/>
			<Field
				id={`${props.prefix}-relationship`}
				label="RELACIÓN"
				value={props.form.relationship}
				placeholder="Me supervisó directamente"
				hint="Cómo trabajó con vos; se muestra junto a la fecha en la tarjeta."
				onInput={(value) => props.onInput('relationship', value)}
			/>
			<Field
				id={`${props.prefix}-linkedin`}
				label="LINK DE LINKEDIN"
				value={props.form.linkedinUrl}
				placeholder="https://www.linkedin.com/in/…"
				hint="URL completa (https://…) o vacío si la tarjeta no muestra enlace."
				onInput={(value) => props.onInput('linkedinUrl', value)}
			/>
			<Field
				id={`${props.prefix}-position`}
				label="POSICIÓN"
				type="number"
				value={props.form.position}
				placeholder="Al final"
				hint="La más chica va primero; si la dejas vacía, el backend decide el lugar."
				onInput={(value) => props.onInput('position', value)}
			/>
		</div>
	);
}

export default function RecommendationsEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [rows, setRows] = createSignal<AdminRecommendationRow[]>([]);
	const [pending, setPending] = createSignal(false);
	const [feedback, setFeedback] = createSignal<Feedback>({ kind: 'idle' });
	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [newForm, setNewForm] = createSignal<FormState>(EMPTY_FORM);
	const [draftForm, setDraftForm] = createSignal<FormState>(EMPTY_FORM);

	async function load(options: { silent?: boolean } = {}) {
		if (!options.silent) setStatus('loading');

		try {
			setRows(await fetchAdminRecommendations());
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

		const created = await mutate(() => createRecommendation(toBody(current)), { kind: 'created' });

		if (created) setNewForm(EMPTY_FORM);
	}

	function startEdit(row: AdminRecommendationRow) {
		setEditingId(row.id);
		setConfirmingDeleteId(null);
		setDraftForm(toForm(row));
		setFeedback({ kind: 'idle' });
	}

	function cancelEdit() {
		setEditingId(null);
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

		const saved = await mutate(() => updateRecommendation(id, toBody(current)), { kind: 'saved' });

		if (saved) setEditingId(null);
	}

	async function handleDelete(id: number) {
		const removed = await mutate(() => deleteRecommendation(id), { kind: 'deleted' });

		if (!removed) return;

		setConfirmingDeleteId(null);
		if (editingId() === id) setEditingId(null);
	}

	function successText(): string | null {
		switch (feedback().kind) {
			case 'created':
				return 'Recomendación añadida. La web ya muestra el cambio.';
			case 'saved':
				return 'Cambios guardados.';
			case 'deleted':
				return 'Recomendación eliminada.';
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
					Cargando las recomendaciones…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar las recomendaciones. Inténtalo de nuevo en unos minutos.
					</p>
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

				<section aria-labelledby="recomendaciones-nueva" class={cardClass}>
					<h2 id="recomendaciones-nueva" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
						NUEVA RECOMENDACIÓN
					</h2>
					<form onSubmit={handleCreate} class="mt-5 grid gap-5">
						<RecommendationFields form={newForm()} prefix="recommendation-new" onInput={updateNew} />
						<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
							<button type="submit" disabled={pending()} class={primaryButtonClass}>
								{pending() ? 'Guardando…' : 'Añadir recomendación'}
							</button>
						</div>
					</form>
				</section>

				<section aria-labelledby="recomendaciones-lista" class="flex flex-col gap-4">
					<div class="flex items-baseline justify-between gap-4">
						<h2 id="recomendaciones-lista" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							RECOMENDACIONES GUARDADAS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{rows().length} {rows().length === 1 ? 'recomendación' : 'recomendaciones'} · en orden de posición
						</p>
					</div>

					<Show
						when={rows().length > 0}
						fallback={
							<p class="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
								Todavía no hay recomendaciones guardadas: la web muestra el estado vacío de la sección. Añade la
								primera en el formulario de arriba.
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
														<p class="truncate font-medium">{row.authorName}</p>
														<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
															{row.authorRole} · {row.relationship}
														</p>
														<p class="mt-1.5 line-clamp-2 text-sm italic leading-relaxed text-muted-foreground">
															«{row.quote}»
														</p>
														<p class="mt-1.5 font-mono text-[12px] text-muted-foreground">
															#{row.position} · {row.linkedinUrl ? 'Con link de LinkedIn' : 'Sin link de LinkedIn'}
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
															<span class="text-[12px] text-muted-foreground">
																¿Eliminar la recomendación de «{row.authorName}»?
															</span>
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
												<RecommendationFields
													form={draftForm()}
													prefix={`recommendation-edit-${row.id}`}
													onInput={updateDraft}
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
