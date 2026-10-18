import { createSignal, For, onMount, Show } from 'solid-js';
import type { ProjectIcon, ProjectStatus } from '../../entities/project/types';
import {
	createProject,
	deleteProject,
	fetchAdminProjects,
	updateProject,
} from './api/projects-admin';
import type { AdminProjectRow, ProjectWriteBody } from './api/projects-admin';

/**
 * Admin CRUD for the projects cards. The list is the stored collection as
 * `GET /projects` serves it; the panel adds one card at a time (`POST`), edits
 * a stored row in place (`PATCH`) and removes it after a second click
 * (`DELETE`). Every mutation refetches, so the list never drifts from storage.
 * The session gate lives in the admin shell (`AdminTopBar` mounts
 * `SessionGuard`), like the other panels. Like the profile editor, the
 * list-shaped `technologies` column stays as textarea text, one item per line.
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
	url: string;
	name: string;
	description: string;
	/** One technology per line; the API stores the list. */
	technologies: string;
	githubUrl: string;
	/** Icon key, empty when the card ships without one. */
	icon: string;
	tagline: string;
	/** Status key, empty when the card has no state. */
	status: string;
	featured: boolean;
};

const EMPTY_FORM: FormState = {
	url: '',
	name: '',
	description: '',
	technologies: '',
	githubUrl: '',
	icon: '',
	tagline: '',
	status: '',
	featured: false,
};

const ICON_OPTIONS: { value: ProjectIcon; label: string }[] = [
	{ value: 'sprout', label: 'Brote' },
	{ value: 'feather', label: 'Pluma' },
	{ value: 'blocks', label: 'Bloques' },
	{ value: 'wrench', label: 'Llave' },
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
	{ value: 'en-produccion', label: 'En producción' },
	{ value: 'en-construccion', label: 'En construcción' },
	{ value: 'codigo-abierto', label: 'Código abierto' },
];

const ICON_KEYS: string[] = ICON_OPTIONS.map((option) => option.value);
const STATUS_KEYS: string[] = STATUS_OPTIONS.map((option) => option.value);

/** Rendered label of a stored status key; raw keys show as they come. */
function statusLabel(status: string): string {
	return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

/** Stored row → editable form, the same mapping the profile editor uses. */
function toForm(row: AdminProjectRow): FormState {
	return {
		url: row.url,
		name: row.name,
		description: row.description,
		technologies: row.technologies.join('\n'),
		githubUrl: row.githubUrl ?? '',
		icon: row.icon ?? '',
		tagline: row.tagline ?? '',
		status: row.status ?? '',
		featured: row.featured === true,
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
 * accepts `null` and clears the stored value, while `''` would fail `@IsUrl()`
 * on `githubUrl` and `@IsNotEmpty()` on the rest.
 */
function toBody(form: FormState): ProjectWriteBody {
	return {
		url: form.url.trim(),
		name: form.name.trim(),
		description: form.description.trim(),
		technologies: toLines(form.technologies),
		githubUrl: form.githubUrl.trim() || null,
		icon: ICON_KEYS.includes(form.icon) ? (form.icon as ProjectIcon) : null,
		tagline: form.tagline.trim() || null,
		status: STATUS_KEYS.includes(form.status) ? (form.status as ProjectStatus) : null,
		featured: form.featured,
	};
}

/** Client-side check so the admin gets Spanish copy instead of a raw `400`. */
function validate(form: FormState): string | null {
	if (!form.url.trim()) return 'El proyecto necesita un enlace.';
	if (!form.name.trim()) return 'El proyecto necesita un nombre.';
	if (!form.description.trim()) return 'El proyecto necesita una descripción.';

	const github = form.githubUrl.trim();
	if (github && !/^https?:\/\//i.test(github)) {
		return 'El repositorio tiene que ser una URL completa, con https:// delante.';
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
const badgeClass =
	'inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground';

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

/** The fields of one project, shared by the add form and the inline editor. */
function ProjectFields(props: {
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
					id={`${props.prefix}-url`}
					label="ENLACE"
					value={props.form.url}
					placeholder="https://…"
					hint="La dirección pública del proyecto."
					onInput={(value) => props.onInput('url', value)}
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
				id={`${props.prefix}-technologies`}
				label="TECNOLOGÍAS"
				value={props.form.technologies}
				multiline
				rows={4}
				hint="Una por línea; las líneas vacías se descartan."
				onInput={(value) => props.onInput('technologies', value)}
			/>
			<div class="grid gap-5 sm:grid-cols-2">
				<Field
					id={`${props.prefix}-github`}
					label="REPOSITORIO (GITHUB)"
					value={props.form.githubUrl}
					placeholder="https://github.com/…"
					hint="Opcional: si falta, la tarjeta enlaza al proyecto."
					onInput={(value) => props.onInput('githubUrl', value)}
				/>
				<Field
					id={`${props.prefix}-tagline`}
					label="FRASE"
					value={props.form.tagline}
					placeholder="Una línea que lo resume"
					hint="Opcional: se pinta debajo del nombre."
					onInput={(value) => props.onInput('tagline', value)}
				/>
			</div>
			<div class="grid gap-5 sm:grid-cols-2">
				<SelectField
					id={`${props.prefix}-icon`}
					label="ICONO"
					value={props.form.icon}
					emptyLabel="Sin icono (la web elige uno)"
					options={ICON_OPTIONS}
					onInput={(value) => props.onInput('icon', value)}
				/>
				<SelectField
					id={`${props.prefix}-status`}
					label="ESTADO"
					value={props.form.status}
					emptyLabel="Sin estado"
					options={STATUS_OPTIONS}
					onInput={(value) => props.onInput('status', value)}
				/>
			</div>
			<div>
				<label class="flex w-fit items-center gap-3">
					<input
						type="checkbox"
						checked={props.form.featured}
						onChange={(event) => props.onInput('featured', event.currentTarget.checked)}
						class="size-4 rounded-sm border border-border bg-background accent-aka"
					/>
					<span class="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">DESTACADO</span>
				</label>
				<p class={hintClass}>La tarjeta grande de la grilla; solo una debería estar marcada.</p>
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

export default function ProjectsEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [rows, setRows] = createSignal<AdminProjectRow[]>([]);
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

	const countLabel = () => (rows().length === 1 ? 'proyecto' : 'proyectos');

	async function load() {
		setStatus('loading');
		try {
			setRows(await fetchAdminProjects());
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

	function startEdit(row: AdminProjectRow) {
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
			await createProject(toBody(current));
			setAddForm(EMPTY_FORM);
			setNotice({
				scope: 'create',
				kind: 'saved',
				message: 'Proyecto agregado. La web ya lo muestra.',
			});
			await load();
		} catch (cause) {
			setNotice({
				scope: 'create',
				kind: 'error',
				message: 'No pudimos guardar el proyecto. Inténtalo de nuevo en unos minutos.',
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
			await updateProject(id, toBody(current));
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
			await deleteProject(id);
			setConfirmingId(null);
			if (editingId() === id) setEditingId(null);
			setNotice({
				scope: 'delete',
				kind: 'saved',
				message: 'Proyecto eliminado. La web ya no lo muestra.',
			});
			await load();
		} catch (cause) {
			setNotice({
				scope: 'delete',
				kind: 'error',
				message: 'No pudimos eliminar el proyecto. Inténtalo de nuevo en unos minutos.',
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
					Cargando los proyectos…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar los proyectos. Inténtalo de nuevo en unos minutos.
					</p>
					<button type="button" onClick={() => void load()} class={`${secondaryButtonClass} h-10 px-5 text-sm`}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={status() === 'ready'}>
				<section aria-labelledby="proyectos-nuevo" class="border border-border bg-card p-6">
					<h2 id="proyectos-nuevo" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
						NUEVO PROYECTO
					</h2>
					<p class={hintClass}>Se agrega al final de la lista; la landing lo muestra al recargar.</p>
					<form onSubmit={handleCreate} class="mt-5 grid gap-5">
						<ProjectFields form={addForm()} prefix="project-new" onInput={updateAdd} />
						<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
							<button type="submit" disabled={creating()} class={primaryButtonClass}>
								{creating() ? 'Agregando…' : 'Agregar proyecto'}
							</button>
							<Feedback notice={noticeFor('create')} />
						</div>
					</form>
				</section>

				<section aria-labelledby="proyectos-lista" class="border border-border bg-card">
					<header class="flex flex-wrap items-baseline justify-between gap-4 border-b border-border px-6 py-4">
						<h2 id="proyectos-lista" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							PROYECTOS PUBLICADOS
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
								Todavía no hay proyectos cargados. En la web la sección queda sin tarjetas hasta que publiques uno.
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
															<Show when={row.tagline}>
																<p class="mt-1 text-sm text-foreground">{row.tagline}</p>
															</Show>
															<p class="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
																{row.description}
															</p>
														</div>
														<p class="max-w-[16rem] truncate font-mono text-[12px] text-muted-foreground">
															{row.url}
														</p>
													</div>

													<div class="mt-3 flex flex-wrap items-center gap-2">
														<Show when={row.status}>
															<span class={badgeClass}>{statusLabel(row.status as string)}</span>
														</Show>
														<Show when={row.featured === true}>
															<span class={badgeClass}>Destacado</span>
														</Show>
														<Show when={row.githubUrl}>
															<span class="max-w-[16rem] truncate font-mono text-[11px] text-muted-foreground">
																{row.githubUrl}
															</span>
														</Show>
													</div>

													<Show when={row.technologies.length > 0}>
														<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1">
															<For each={row.technologies}>
																{(technology) => (
																	<li class="text-[12px] text-muted-foreground">· {technology}</li>
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
																<span class="text-[12px] text-muted-foreground">¿Eliminar este proyecto?</span>
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
												<ProjectFields
													form={editForm()}
													prefix={`project-edit-${row.id}`}
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
