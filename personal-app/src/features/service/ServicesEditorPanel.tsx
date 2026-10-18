import { createSignal, For, onMount, Show } from 'solid-js';
import type { ServiceIcon } from '../../entities/service/types';
import {
	createService,
	deleteService,
	fetchAdminServices,
	updateService,
} from './api/services-admin';
import type { AdminServiceRow, ServiceWriteBody } from './api/services-admin';

/**
 * Admin CRUD for the services cards. The list is the stored collection as
 * `GET /services` serves it; the panel adds one card at a time (`POST`), edits
 * a stored row in place (`PATCH`) and removes it after a second click
 * (`DELETE`). Every mutation refetches, so the list never drifts from storage.
 * The session gate lives in the admin shell (`AdminTopBar` mounts
 * `SessionGuard`), like the other panels. Like the profile editor, the
 * list-shaped `features` column stays as textarea text, one item per line.
 */

type Status = 'loading' | 'ready' | 'error';

/** Mutation feedback. `detail` carries the API message when there is one. */
type Notice = {
	scope: 'create' | 'edit' | 'delete';
	kind: 'saved' | 'error';
	message: string;
	detail?: string;
};

type FormState = {
	name: string;
	description: string;
	/** One feature per line; the API stores the list. */
	features: string;
	/** Numeric text: the stored column is a number. */
	price: string;
	/** Icon key, empty when the card ships without one. */
	icon: string;
	priceLabel: string;
};

const EMPTY_FORM: FormState = {
	name: '',
	description: '',
	features: '',
	price: '',
	icon: '',
	priceLabel: '',
};

const ICON_OPTIONS: { value: ServiceIcon; label: string }[] = [
	{ value: 'pen-line', label: 'Lapicero' },
	{ value: 'handshake', label: 'Apretón de manos' },
	{ value: 'graduation-cap', label: 'Birrete' },
];

const ICON_KEYS: string[] = ICON_OPTIONS.map((option) => option.value);

/** Stored row → editable form, the same mapping the profile editor uses. */
function toForm(row: AdminServiceRow): FormState {
	return {
		name: row.name,
		description: row.description,
		features: row.features.join('\n'),
		price: String(row.price),
		icon: row.icon ?? '',
		priceLabel: row.priceLabel ?? '',
	};
}

/** Textarea text → list, dropping the blank lines used as separators. */
function toLines(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * Form → API body. `null` (not `''`) for the empty optional columns: the DTO
 * accepts `null` and clears the stored value.
 */
function toBody(form: FormState): ServiceWriteBody {
	return {
		name: form.name.trim(),
		description: form.description.trim(),
		features: toLines(form.features),
		price: Number(form.price),
		icon: ICON_KEYS.includes(form.icon) ? (form.icon as ServiceIcon) : null,
		priceLabel: form.priceLabel.trim() || null,
	};
}

/** Client-side check so the admin gets Spanish copy instead of a raw `400`. */
function validate(form: FormState): string | null {
	if (!form.name.trim()) return 'El servicio necesita un nombre.';
	if (!form.description.trim()) return 'El servicio necesita una descripción.';
	if (form.price.trim() === '' || !Number.isFinite(Number(form.price))) {
		return 'El precio tiene que ser un número.';
	}
	return null;
}

/** The message of the shared helper, which maps `{ message }` from the API. */
function messageFrom(cause: unknown): string | undefined {
	return cause instanceof Error && cause.message ? cause.message : undefined;
}

const labelClass = 'block text-[11px] font-medium tracking-[0.2em] text-muted-foreground';
const inputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const hintClass = 'mt-1.5 text-[11px] leading-relaxed text-muted-foreground';
const primaryButtonClass =
	'inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';
const dangerButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60';

type FieldProps = {
	id: string;
	label: string;
	value: string;
	hint?: string;
	multiline?: boolean;
	rows?: number;
	placeholder?: string;
	onInput: (value: string) => void;
};

/** One labelled input/textarea, shared by every field of both forms. */
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
						type="text"
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

type SelectFieldProps = {
	id: string;
	label: string;
	value: string;
	emptyLabel: string;
	options: { value: string; label: string }[];
	hint?: string;
	onInput: (value: string) => void;
};

/** One labelled select; the empty option clears the stored column. */
function SelectField(props: SelectFieldProps) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				{props.label}
			</label>
			<select
				id={props.id}
				onChange={(event) => props.onInput(event.currentTarget.value)}
				class={`${inputClass} mt-2`}
			>
				<option value="" selected={props.value === ''}>
					{props.emptyLabel}
				</option>
				<For each={props.options}>
					{(option) => (
						<option value={option.value} selected={option.value === props.value}>
							{option.label}
						</option>
					)}
				</For>
			</select>
			{props.hint && <p class={hintClass}>{props.hint}</p>}
		</div>
	);
}

/** The fields of one service, shared by the add form and the inline editor. */
function ServiceFields(props: {
	form: FormState;
	prefix: string;
	onInput: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
	return (
		<>
			<div class="grid gap-5 sm:grid-cols-2">
				<Field
					id={`${props.prefix}-name`}
					label="NOMBRE"
					value={props.form.name}
					onInput={(value) => props.onInput('name', value)}
				/>
				<Field
					id={`${props.prefix}-price`}
					label="PRECIO (USD)"
					value={props.form.price}
					placeholder="150"
					onInput={(value) => props.onInput('price', value)}
				/>
			</div>
			<Field
				id={`${props.prefix}-description`}
				label="DESCRIPCIÓN"
				value={props.form.description}
				multiline
				rows={3}
				onInput={(value) => props.onInput('description', value)}
			/>
			<Field
				id={`${props.prefix}-features`}
				label="PRESTACIONES"
				value={props.form.features}
				multiline
				rows={5}
				hint="Una por línea; las líneas vacías se descartan."
				onInput={(value) => props.onInput('features', value)}
			/>
			<div class="grid gap-5 sm:grid-cols-2">
				<SelectField
					id={`${props.prefix}-icon`}
					label="ICONO"
					value={props.form.icon}
					emptyLabel="Sin icono (la web elige uno)"
					options={ICON_OPTIONS}
					onInput={(value) => props.onInput('icon', value)}
				/>
				<Field
					id={`${props.prefix}-price-label`}
					label="ETIQUETA DE PRECIO"
					value={props.form.priceLabel}
					placeholder="desde USD 150"
					hint="Opcional: el texto que la tarjeta muestra en lugar del número."
					onInput={(value) => props.onInput('priceLabel', value)}
				/>
			</div>
		</>
	);
}

/** Saved/error line of one mutation, in Spanish with the API detail. */
function Feedback(props: { notice: Notice | null }) {
	return (
		<>
			<Show when={props.notice?.kind === 'saved'}>
				<p role="status" class="flex items-center gap-2 text-sm text-foreground">
					<span class="size-1.5 rounded-full bg-aka" aria-hidden="true" />
					{props.notice?.message}
				</p>
			</Show>
			<Show when={props.notice?.kind === 'error'}>
				<div role="alert" class="text-sm text-destructive">
					<p>{props.notice?.message}</p>
					<Show when={props.notice?.detail}>
						<p class="mt-1 font-mono text-[11px] leading-relaxed">{props.notice?.detail}</p>
					</Show>
				</div>
			</Show>
		</>
	);
}

export default function ServicesEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [rows, setRows] = createSignal<AdminServiceRow[]>([]);
	const [notice, setNotice] = createSignal<Notice | null>(null);

	const [addForm, setAddForm] = createSignal<FormState>(EMPTY_FORM);
	const [creating, setCreating] = createSignal(false);

	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [editForm, setEditForm] = createSignal<FormState>(EMPTY_FORM);
	const [savingEdit, setSavingEdit] = createSignal(false);

	const [confirmingId, setConfirmingId] = createSignal<number | null>(null);
	const [deletingId, setDeletingId] = createSignal<number | null>(null);

	const noticeFor = (scope: Notice['scope']) => {
		const current = notice();
		return current && current.scope === scope ? current : null;
	};

	const priceOf = (row: AdminServiceRow) => row.priceLabel ?? `USD ${row.price}`;
	const countLabel = () => (rows().length === 1 ? 'servicio' : 'servicios');

	async function load() {
		setStatus('loading');
		try {
			setRows(await fetchAdminServices());
			setStatus('ready');
		} catch {
			// The API message can be raw (for example `Unauthorized`); the panel
			// answers in Spanish and offers a retry, like the subscribers view.
			setStatus('error');
		}
	}

	onMount(() => {
		void load();
	});

	function updateAdd<K extends keyof FormState>(key: K, value: FormState[K]) {
		setAddForm((current) => ({ ...current, [key]: value }));
	}

	function updateEdit<K extends keyof FormState>(key: K, value: FormState[K]) {
		setEditForm((current) => ({ ...current, [key]: value }));
	}

	function startEdit(row: AdminServiceRow) {
		setEditingId(row.id);
		setEditForm(toForm(row));
		setConfirmingId(null);
		setNotice(null);
	}

	function cancelEdit() {
		setEditingId(null);
	}

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();

		if (creating()) return;

		const current = addForm();
		const complaint = validate(current);

		if (complaint) {
			setNotice({ scope: 'create', kind: 'error', message: complaint });
			return;
		}

		setCreating(true);
		setNotice(null);

		try {
			await createService(toBody(current));
			setAddForm(EMPTY_FORM);
			setNotice({
				scope: 'create',
				kind: 'saved',
				message: 'Servicio agregado. La web ya lo muestra.',
			});
			await load();
		} catch (cause) {
			setNotice({
				scope: 'create',
				kind: 'error',
				message: 'No pudimos guardar el servicio. Inténtalo de nuevo en unos minutos.',
				detail: messageFrom(cause),
			});
		} finally {
			setCreating(false);
		}
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();

		if (savingEdit()) return;

		const current = editForm();
		const complaint = validate(current);

		if (complaint) {
			setNotice({ scope: 'edit', kind: 'error', message: complaint });
			return;
		}

		setSavingEdit(true);
		setNotice(null);

		try {
			await updateService(id, toBody(current));
			setNotice({
				scope: 'edit',
				kind: 'saved',
				message: 'Cambios guardados. La web ya los muestra.',
			});
			await load();
		} catch (cause) {
			setNotice({
				scope: 'edit',
				kind: 'error',
				message: 'No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.',
				detail: messageFrom(cause),
			});
		} finally {
			setSavingEdit(false);
		}
	}

	async function handleDelete(id: number) {
		if (deletingId() !== null) return;

		setDeletingId(id);
		setNotice(null);

		try {
			await deleteService(id);
			setConfirmingId(null);
			if (editingId() === id) setEditingId(null);
			setNotice({
				scope: 'delete',
				kind: 'saved',
				message: 'Servicio eliminado. La web ya no lo muestra.',
			});
			await load();
		} catch (cause) {
			setNotice({
				scope: 'delete',
				kind: 'error',
				message: 'No pudimos eliminar el servicio. Inténtalo de nuevo en unos minutos.',
				detail: messageFrom(cause),
			});
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<div class="flex flex-col gap-8">
			<Show when={status() === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando los servicios…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar los servicios. Inténtalo de nuevo en unos minutos.
					</p>
					<button type="button" onClick={() => void load()} class={`${secondaryButtonClass} h-10 px-5 text-sm`}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={status() === 'ready'}>
				<section aria-labelledby="servicios-nuevo" class="border border-border bg-card p-6">
					<h2 id="servicios-nuevo" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
						NUEVO SERVICIO
					</h2>
					<p class={hintClass}>Se agrega al final de la lista; la landing lo muestra al recargar.</p>
					<form onSubmit={handleCreate} class="mt-5 grid gap-5">
						<ServiceFields form={addForm()} prefix="service-new" onInput={updateAdd} />
						<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
							<button type="submit" disabled={creating()} class={primaryButtonClass}>
								{creating() ? 'Agregando…' : 'Agregar servicio'}
							</button>
							<Feedback notice={noticeFor('create')} />
						</div>
					</form>
				</section>

				<section aria-labelledby="servicios-lista" class="border border-border bg-card">
					<header class="flex flex-wrap items-baseline justify-between gap-4 border-b border-border px-6 py-4">
						<h2 id="servicios-lista" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							SERVICIOS PUBLICADOS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{rows().length} {countLabel()}
						</p>
					</header>

					<Show when={noticeFor('delete')}>
						<div class="border-b border-border px-6 py-3">
							<Feedback notice={noticeFor('delete')} />
						</div>
					</Show>

					<Show
						when={rows().length > 0}
						fallback={
							<p class="px-6 py-6 text-sm text-muted-foreground">
								Todavía no hay servicios cargados. La web muestra los que trae de fábrica hasta que agregues uno.
							</p>
						}
					>
						<ul class="divide-y divide-border">
							<For each={rows()}>
								{(row) => (
									<li class="px-6 py-5">
										<Show
											when={editingId() === row.id}
											fallback={
												<div>
													<div class="flex flex-wrap items-start justify-between gap-4">
														<div class="min-w-0">
															<p class="font-mincho text-xl font-semibold tracking-tight">{row.name}</p>
															<p class="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
																{row.description}
															</p>
														</div>
														<p class="font-mono text-[12px] text-muted-foreground">{priceOf(row)}</p>
													</div>

													<Show when={row.features.length > 0}>
														<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1">
															<For each={row.features}>
																{(feature) => (
																	<li class="text-[12px] text-muted-foreground">· {feature}</li>
																)}
															</For>
														</ul>
													</Show>

													<div class="mt-4 flex flex-wrap items-center gap-3">
														<button
															type="button"
															onClick={() => startEdit(row)}
															class={secondaryButtonClass}
														>
															Editar
														</button>
														<Show
															when={confirmingId() === row.id}
															fallback={
																<button
																	type="button"
																	onClick={() => setConfirmingId(row.id)}
																	class={dangerButtonClass}
																>
																	Eliminar
																</button>
															}
														>
															<span class="flex flex-wrap items-center gap-3">
																<span class="text-[12px] text-muted-foreground">¿Eliminar este servicio?</span>
																<button
																	type="button"
																	disabled={deletingId() !== null}
																	onClick={() => void handleDelete(row.id)}
																	class={`${dangerButtonClass} border-destructive/50 text-destructive`}
																>
																	{deletingId() === row.id ? 'Eliminando…' : 'Sí, eliminar'}
																</button>
																<button
																	type="button"
																	onClick={() => setConfirmingId(null)}
																	class={secondaryButtonClass}
																>
																	Cancelar
																</button>
															</span>
														</Show>
													</div>
												</div>
											}
										>
											<form
												onSubmit={(event) => void handleEdit(event, row.id)}
												class="grid gap-5"
												aria-label={`Editar ${row.name}`}
											>
												<ServiceFields
													form={editForm()}
													prefix={`service-edit-${row.id}`}
													onInput={updateEdit}
												/>
												<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
													<button
														type="submit"
														disabled={savingEdit()}
														class={`${primaryButtonClass} h-10 px-5`}
													>
														{savingEdit() ? 'Guardando…' : 'Guardar cambios'}
													</button>
													<button
														type="button"
														disabled={savingEdit()}
														onClick={cancelEdit}
														class={secondaryButtonClass}
													>
														Cancelar
													</button>
													<Feedback notice={noticeFor('edit')} />
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
