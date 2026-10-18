import { createSignal, For, onMount, Show } from 'solid-js';
import { createTool, deleteTool, fetchToolRows, updateTool } from './api/tools-admin';
import type { ToolRow } from './api/tools-admin';

/**
 * Admin CRUD for the `tools` domain — the "herramientas que uso" grid the
 * landing renders from `GET /tools` (`/admin/herramientas/`). The island reads,
 * creates, edits and deletes through the shared http helpers, and reloads the
 * stored list after every mutation, so the rows it shows always match the API.
 * The session gate lives in the admin shell (`AdminTopBar` mounts
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

const labelClass = 'block text-[11px] font-medium tracking-[0.2em] text-muted-foreground';
const inputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const cardClass = 'border border-border bg-card p-6';
const primaryButtonClass =
	'inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';
const ghostButtonClass =
	'inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';
const rowButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';
const dangerButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60';

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
	onInput: (value: string) => void;
};

/** One labelled text input, shared by the create form and the row editors. */
function Field(props: FieldProps) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				{props.label}
			</label>
			<input
				id={props.id}
				type="text"
				value={props.value}
				placeholder={props.placeholder}
				onInput={(event) => props.onInput(event.currentTarget.value)}
				class={`${inputClass} mt-2`}
			/>
			{props.hint && <p class="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{props.hint}</p>}
		</div>
	);
}

export default function ToolsEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [rows, setRows] = createSignal<ToolRow[]>([]);
	const [pending, setPending] = createSignal(false);
	const [feedback, setFeedback] = createSignal<Feedback>({ kind: 'idle' });
	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [newName, setNewName] = createSignal('');
	const [newWhat, setNewWhat] = createSignal('');
	const [draftName, setDraftName] = createSignal('');
	const [draftWhat, setDraftWhat] = createSignal('');

	async function load(options: { silent?: boolean } = {}) {
		if (!options.silent) setStatus('loading');

		try {
			setRows(await fetchToolRows());
			setStatus('ready');
		} catch {
			setStatus('error');
		}
	}

	onMount(() => {
		void load();
	});

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

		const name = newName().trim();
		if (!name) return;

		const created = await mutate(() => createTool({ name, what: newWhat().trim() }), { kind: 'created' });

		if (created) {
			setNewName('');
			setNewWhat('');
		}
	}

	function startEdit(row: ToolRow) {
		setEditingId(row.id);
		setConfirmingDeleteId(null);
		setDraftName(row.name);
		setDraftWhat(row.what);
		setFeedback({ kind: 'idle' });
	}

	function cancelEdit() {
		setEditingId(null);
		setFeedback({ kind: 'idle' });
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();

		const name = draftName().trim();
		if (!name) return;

		const saved = await mutate(() => updateTool(id, { name, what: draftWhat().trim() }), { kind: 'saved' });

		if (saved) setEditingId(null);
	}

	async function handleDelete(id: number) {
		const removed = await mutate(() => deleteTool(id), { kind: 'deleted' });

		if (!removed) return;

		setConfirmingDeleteId(null);
		if (editingId() === id) setEditingId(null);
	}

	function successText(): string | null {
		switch (feedback().kind) {
			case 'created':
				return 'Herramienta añadida. La web ya muestra el cambio.';
			case 'saved':
				return 'Cambios guardados.';
			case 'deleted':
				return 'Herramienta eliminada.';
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
					Cargando las herramientas…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">No pudimos cargar las herramientas. Inténtalo de nuevo en unos minutos.</p>
					<button type="button" onClick={() => void load()} class={ghostButtonClass}>
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

				<section aria-labelledby="herramientas-nueva" class={cardClass}>
					<h2 id="herramientas-nueva" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
						NUEVA HERRAMIENTA
					</h2>
					<form onSubmit={handleCreate} class="mt-5 grid gap-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
						<Field
							id="tool-new-name"
							label="NOMBRE"
							value={newName()}
							placeholder="Astro"
							onInput={(value) => setNewName(value)}
						/>
						<Field
							id="tool-new-what"
							label="PARA QUÉ SIRVE"
							value={newWhat()}
							placeholder="El sitio entero, del markdown al HTML"
							onInput={(value) => setNewWhat(value)}
						/>
						<button type="submit" disabled={pending() || !newName().trim()} class={primaryButtonClass}>
							{pending() ? 'Guardando…' : 'Añadir'}
						</button>
					</form>
					<p class="mt-3 text-[11px] leading-relaxed text-muted-foreground">
						El nombre no puede quedar vacío. La nota «para qué sirve» se muestra en una línea bajo el nombre.
					</p>
				</section>

				<section aria-labelledby="herramientas-lista" class="flex flex-col gap-4">
					<div class="flex items-baseline justify-between gap-4">
						<h2 id="herramientas-lista" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							HERRAMIENTAS GUARDADAS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{rows().length} {rows().length === 1 ? 'fila' : 'filas'}
						</p>
					</div>

					<Show
						when={rows().length > 0}
						fallback={
							<p class="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
								Todavía no hay herramientas guardadas: la landing no muestra el bloque. Añade la primera en el formulario
								de arriba.
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
														<p class="truncate font-medium">{row.name}</p>
														<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
															{row.what || 'Sin nota.'}
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
															<span class="text-[12px] text-muted-foreground">¿Eliminar «{row.name}»?</span>
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
											<form
												onSubmit={(event) => void handleEdit(event, row.id)}
												class="grid gap-5 sm:grid-cols-[1fr_2fr]"
											>
												<Field
													id={`tool-edit-name-${row.id}`}
													label="NOMBRE"
													value={draftName()}
													onInput={(value) => setDraftName(value)}
												/>
												<Field
													id={`tool-edit-what-${row.id}`}
													label="PARA QUÉ SIRVE"
													value={draftWhat()}
													onInput={(value) => setDraftWhat(value)}
												/>
												<div class="flex flex-wrap items-center gap-2 sm:col-span-2">
													<button
														type="submit"
														disabled={pending() || !draftName().trim()}
														class={primaryButtonClass}
													>
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
