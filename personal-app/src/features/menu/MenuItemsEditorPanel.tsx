import { createSignal, For, onMount, Show } from 'solid-js';
import {
	createMenuItem,
	deleteMenuItem,
	fetchMenuItemRows,
	updateMenuItem,
} from './api/menu-items-admin';
import type { MenuItemInput, MenuItemRow } from './api/menu-items-admin';

/**
 * Admin CRUD for the `menu-items` domain — the site menu that `SiteHeader` and
 * the mobile navigation read from `GET /menu-items` (`/admin/menu/`). Every
 * mutation reloads the stored list, so the rows keep the backend order
 * (`position`, ties by id) and the panel always shows the real positions. The
 * session gate lives in the admin shell, like the other panels.
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
 * (append on create, keep it on update) and `invalid` is a non-integer the
 * panel refuses to guess about.
 */
type Position = number | null | 'invalid';

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

const INVALID_POSITION = 'La posición tiene que ser un número entero igual o mayor que cero.';

/**
 * Keeps the Spanish copy and appends the backend detail: a validation failure
 * answers `400 { message }` and hiding it would leave the admin without the
 * reason.
 */
function withDetail(fallback: string, cause: unknown): string {
	const detail = cause instanceof Error ? cause.message.trim() : '';

	return detail ? `${fallback} (${detail})` : fallback;
}

/** Reads the position input: blank stays blank, bad text is refused. */
function readPosition(value: string): Position {
	const trimmed = value.trim();

	if (!trimmed) return null;

	const parsed = Number(trimmed);

	return Number.isInteger(parsed) && parsed >= 0 ? parsed : 'invalid';
}

type FieldProps = {
	id: string;
	label: string;
	value: string;
	placeholder?: string;
	hint?: string;
	type?: 'text' | 'number';
	onInput: (value: string) => void;
};

/** One labelled input, shared by the create form and the row editors. */
function Field(props: FieldProps) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				{props.label}
			</label>
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
			{props.hint && <p class="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{props.hint}</p>}
		</div>
	);
}

export default function MenuItemsEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [rows, setRows] = createSignal<MenuItemRow[]>([]);
	const [pending, setPending] = createSignal(false);
	const [feedback, setFeedback] = createSignal<Feedback>({ kind: 'idle' });
	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [newLabel, setNewLabel] = createSignal('');
	const [newHref, setNewHref] = createSignal('');
	const [newPosition, setNewPosition] = createSignal('');
	const [draftLabel, setDraftLabel] = createSignal('');
	const [draftHref, setDraftHref] = createSignal('');
	const [draftPosition, setDraftPosition] = createSignal('');

	async function load(options: { silent?: boolean } = {}) {
		if (!options.silent) setStatus('loading');

		try {
			setRows(await fetchMenuItemRows());
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

		const label = newLabel().trim();
		const href = newHref().trim();
		const position = readPosition(newPosition());

		if (!label || !href) return;

		if (position === 'invalid') {
			setFeedback({ kind: 'error', message: INVALID_POSITION });
			return;
		}

		const body: MenuItemInput = { label, href };
		if (position !== null) body.position = position;

		const created = await mutate(() => createMenuItem(body), { kind: 'created' });

		if (created) {
			setNewLabel('');
			setNewHref('');
			setNewPosition('');
		}
	}

	function startEdit(row: MenuItemRow) {
		setEditingId(row.id);
		setConfirmingDeleteId(null);
		setDraftLabel(row.label);
		setDraftHref(row.href);
		setDraftPosition(String(row.position));
		setFeedback({ kind: 'idle' });
	}

	function cancelEdit() {
		setEditingId(null);
		setFeedback({ kind: 'idle' });
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();

		const label = draftLabel().trim();
		const href = draftHref().trim();
		const position = readPosition(draftPosition());

		if (!label || !href) return;

		if (position === 'invalid') {
			setFeedback({ kind: 'error', message: INVALID_POSITION });
			return;
		}

		const body: Partial<MenuItemInput> = { label, href };
		if (position !== null) body.position = position;

		const saved = await mutate(() => updateMenuItem(id, body), { kind: 'saved' });

		if (saved) setEditingId(null);
	}

	async function handleDelete(id: number) {
		const removed = await mutate(() => deleteMenuItem(id), { kind: 'deleted' });

		if (!removed) return;

		setConfirmingDeleteId(null);
		if (editingId() === id) setEditingId(null);
	}

	function successText(): string | null {
		switch (feedback().kind) {
			case 'created':
				return 'Enlace añadido. La web ya muestra el menú actualizado.';
			case 'saved':
				return 'Cambios guardados.';
			case 'deleted':
				return 'Enlace eliminado.';
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
					Cargando el menú…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">No pudimos cargar el menú. Inténtalo de nuevo en unos minutos.</p>
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

				<section aria-labelledby="menu-nuevo" class={cardClass}>
					<h2 id="menu-nuevo" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
						NUEVO ENLACE
					</h2>
					<form onSubmit={handleCreate} class="mt-5 grid gap-5 sm:grid-cols-[1fr_2fr_7rem_auto] sm:items-end">
						<Field
							id="menu-new-label"
							label="ETIQUETA"
							value={newLabel()}
							placeholder="Diario"
							onInput={(value) => setNewLabel(value)}
						/>
						<Field
							id="menu-new-href"
							label="DESTINO"
							value={newHref()}
							placeholder="/#diario"
							onInput={(value) => setNewHref(value)}
						/>
						<Field
							id="menu-new-position"
							label="POSICIÓN"
							type="number"
							value={newPosition()}
							placeholder="Al final"
							onInput={(value) => setNewPosition(value)}
						/>
						<button
							type="submit"
							disabled={pending() || !newLabel().trim() || !newHref().trim()}
							class={primaryButtonClass}
						>
							{pending() ? 'Guardando…' : 'Añadir'}
						</button>
					</form>
					<p class="mt-3 text-[11px] leading-relaxed text-muted-foreground">
						La etiqueta y el destino no pueden quedar vacíos. La posición más chica va primero; si la dejas vacía, el
						enlace se agrega al final.
					</p>
				</section>

				<section aria-labelledby="menu-lista" class="flex flex-col gap-4">
					<div class="flex items-baseline justify-between gap-4">
						<h2 id="menu-lista" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							ENLACES GUARDADOS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{rows().length} {rows().length === 1 ? 'enlace' : 'enlaces'} · en orden de posición
						</p>
					</div>

					<Show
						when={rows().length > 0}
						fallback={
							<p class="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
								Todavía no hay enlaces guardados: el encabezado de la web se queda sin menú. Añade el primero en el
								formulario de arriba.
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
													<div class="flex min-w-0 items-baseline gap-4">
														<span
															class="shrink-0 font-mono text-[11px] text-muted-foreground"
															aria-label={`Posición ${row.position}`}
														>
															#{row.position}
														</span>
														<div class="min-w-0">
															<p class="truncate font-medium">{row.label}</p>
															<p class="mt-1 truncate font-mono text-[12px] text-muted-foreground">{row.href}</p>
														</div>
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
															<span class="text-[12px] text-muted-foreground">¿Eliminar «{row.label}»?</span>
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
												class="grid gap-5 sm:grid-cols-[1fr_2fr_7rem]"
											>
												<Field
													id={`menu-edit-label-${row.id}`}
													label="ETIQUETA"
													value={draftLabel()}
													onInput={(value) => setDraftLabel(value)}
												/>
												<Field
													id={`menu-edit-href-${row.id}`}
													label="DESTINO"
													value={draftHref()}
													onInput={(value) => setDraftHref(value)}
												/>
												<Field
													id={`menu-edit-position-${row.id}`}
													label="POSICIÓN"
													type="number"
													value={draftPosition()}
													hint={`Posición guardada: ${row.position}.`}
													onInput={(value) => setDraftPosition(value)}
												/>
												<div class="flex flex-wrap items-center gap-2 sm:col-span-3">
													<button
														type="submit"
														disabled={pending() || !draftLabel().trim() || !draftHref().trim()}
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
