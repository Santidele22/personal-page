import { createSignal, For, onMount, Show } from 'solid-js';
import type { BookKind, ReadingStatus } from '../../entities/book/types';
import {
	createBook,
	deleteBook,
	fetchAdminBooks,
	updateBook,
	uploadBookFile,
} from './api/books-admin';
import type { AdminBookRow, BookWriteBody } from './api/books-admin';

/**
 * Admin CRUD for the reading books. The list is the stored collection as
 * `GET /books` serves it; the panel adds one book at a time (`POST`), edits a
 * stored row in place (`PATCH`), attaches (or replaces) its PDF through the
 * multipart endpoint and removes it after a second click (`DELETE`). Every
 * mutation refetches, so the list never drifts from storage. The session gate
 * lives in the admin shell (`AdminTopBar` mounts `SessionGuard`), like the
 * other panels.
 */

type Status = 'loading' | 'ready' | 'error';

/** Mutation feedback. `detail` carries the API message when there is one. */
type Notice = {
	scope: 'create' | 'edit' | 'delete' | 'upload';
	kind: 'saved' | 'error';
	message: string;
	detail?: string;
};

type FormState = {
	title: string;
	author: string;
	description: string;
	/** Reading status key; the DTO requires it, so it always has a value. */
	status: string;
	/** Landing shelf key; the DTO accepts it optionally, the form always sends it. */
	kind: string;
	review: string;
	published: boolean;
};

const EMPTY_FORM: FormState = {
	title: '',
	author: '',
	description: '',
	status: 'reading',
	kind: 'no_tecnico',
	review: '',
	published: false,
};

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
	{ value: 'reading', label: 'Leyendo' },
	{ value: 'finished', label: 'Terminado' },
	{ value: 'queued', label: 'En cola' },
];

const KIND_OPTIONS: { value: BookKind; label: string }[] = [
	{ value: 'tecnico', label: 'Técnico' },
	{ value: 'no_tecnico', label: 'No técnico' },
];

const KIND_KEYS: string[] = KIND_OPTIONS.map((option) => option.value);

/** Rendered label of a stored kind key; raw keys show as they come. */
function kindLabel(kind: string | null | undefined): string {
	return KIND_OPTIONS.find((option) => option.value === kind)?.label ?? 'No técnico';
}

const STATUS_KEYS: string[] = STATUS_OPTIONS.map((option) => option.value);

/** Rendered label of a stored status key; raw keys show as they come. */
function statusLabel(status: string): string {
	return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

/** Stored row → editable form, the same mapping the projects editor uses. */
function toForm(row: AdminBookRow): FormState {
	return {
		title: row.title,
		author: row.author,
		description: row.description,
		status: row.status ?? 'reading',
		kind: row.kind ?? 'no_tecnico',
		review: row.review ?? '',
		published: row.published === true,
	};
}

/** Form → API body. `status` always travels as an enum key the DTO accepts. */
function toBody(form: FormState): BookWriteBody {
	return {
		title: form.title.trim(),
		author: form.author.trim(),
		description: form.description.trim(),
		status: STATUS_KEYS.includes(form.status) ? (form.status as ReadingStatus) : 'reading',
		kind: KIND_KEYS.includes(form.kind) ? (form.kind as BookKind) : 'no_tecnico',
		review: form.review.trim() || null,
		published: form.published,
	};
}

/** Client-side check so the admin gets Spanish copy instead of a raw `400`. */
function validate(form: FormState): string | null {
	if (!form.title.trim()) return 'El libro necesita un título.';
	if (!form.author.trim()) return 'El libro necesita un autor.';
	if (!form.description.trim()) return 'El libro necesita una descripción.';

	return null;
}

/** Uploaded file size (`bigint` arrives as a string) → readable label. */
function formatSize(size: string | null | undefined): string | null {
	if (!size) return null;

	const bytes = Number(size);
	if (!Number.isFinite(bytes) || bytes <= 0) return null;

	const units = ['B', 'KB', 'MB', 'GB'];
	let value = bytes;
	let unit = 0;

	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}

	return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
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
	options: { value: string; label: string }[];
	hint?: string;
	onInput: (value: string) => void;
};

/** One labelled select; every option is a valid enum key. */
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

/** The fields of one book, shared by the add form and the inline editor. */
function BookFields(props: {
	form: FormState;
	prefix: string;
	onInput: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
	return (
		<>
			<div class="grid gap-5 sm:grid-cols-2">
				<Field
					id={`${props.prefix}-title`}
					label="TÍTULO"
					value={props.form.title}
					onInput={(value) => props.onInput('title', value)}
				/>
				<Field
					id={`${props.prefix}-author`}
					label="AUTOR"
					value={props.form.author}
					placeholder="Quién lo escribió"
					onInput={(value) => props.onInput('author', value)}
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
			<SelectField
				id={`${props.prefix}-status`}
				label="ESTADO"
				value={props.form.status}
				options={STATUS_OPTIONS}
				onInput={(value) => props.onInput('status', value)}
			/>
			<SelectField
				id={`${props.prefix}-kind`}
				label="CATEGORÍA"
				value={props.form.kind}
				options={KIND_OPTIONS}
				hint="Aparece en el apartado de libros técnicos o no técnicos de la web."
				onInput={(value) => props.onInput('kind', value)}
			/>
			<Field
				id={`${props.prefix}-review`}
				label="RESEÑA"
				value={props.form.review}
				multiline
				rows={4}
				hint="Opcional: si la dejás vacía, el libro se muestra sin comentario."
				onInput={(value) => props.onInput('review', value)}
			/>
			<div>
				<label class="flex w-fit items-center gap-3">
					<input
						type="checkbox"
						checked={props.form.published}
						onChange={(event) => props.onInput('published', event.currentTarget.checked)}
						class="size-4 rounded-sm border border-border bg-background accent-aka"
					/>
					<span class="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">PUBLICADO</span>
				</label>
				<p class={hintClass}>Solo los publicados aparecen en la web y se pueden descargar.</p>
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

/**
 * PDF picker of one book. It owns the selected `File` and hands it to the
 * panel, which runs the upload and reports back through the shared notice; the
 * input resets because the panel refetches and remounts this list after a
 * successful upload.
 */
function BookFileUpload(props: {
	book: AdminBookRow;
	uploading: boolean;
	onUpload: (file: File) => void;
}) {
	const [file, setFile] = createSignal<File | null>(null);
	const inputId = () => `book-file-${props.book.id}`;
	const size = () => formatSize(props.book.fileSize);

	return (
		<div class="mt-4 border-t border-border pt-4">
			<Show when={props.book.originalName}>
				<p class="text-[12px] text-muted-foreground">
					PDF actual:{' '}
					<span class="font-mono text-[11px] text-foreground">{props.book.originalName}</span>
					<Show when={size()}>
						{' '}
						· {size()}
					</Show>
				</p>
			</Show>
			<form
				class="mt-3 flex flex-wrap items-center gap-3"
				onSubmit={(event) => {
					event.preventDefault();
					const selected = file();
					if (selected) props.onUpload(selected);
				}}
			>
				<label for={inputId()} class={hintClass}>
					{props.book.originalName ? 'Reemplazar PDF' : 'Subir PDF'}
				</label>
				<input
					id={inputId()}
					type="file"
					accept="application/pdf"
					onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
					class="block max-w-full text-[12px] text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-foreground hover:file:border-aka hover:file:text-aka"
				/>
				<button
					type="submit"
					disabled={props.uploading || file() === null}
					class={secondaryButtonClass}
				>
					{props.uploading ? 'Subiendo…' : 'Subir'}
				</button>
			</form>
		</div>
	);
}

export default function BooksEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [rows, setRows] = createSignal<AdminBookRow[]>([]);
	const [notice, setNotice] = createSignal<Notice | null>(null);

	const [addForm, setAddForm] = createSignal<FormState>(EMPTY_FORM);
	const [creating, setCreating] = createSignal(false);

	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [editForm, setEditForm] = createSignal<FormState>(EMPTY_FORM);
	const [savingEdit, setSavingEdit] = createSignal(false);

	const [confirmingId, setConfirmingId] = createSignal<number | null>(null);
	const [deletingId, setDeletingId] = createSignal<number | null>(null);

	const [uploadingId, setUploadingId] = createSignal<number | null>(null);

	const noticeFor = (scope: Notice['scope']) => {
		const current = notice();
		return current && current.scope === scope ? current : null;
	};

	const countLabel = () => (rows().length === 1 ? 'libro' : 'libros');

	async function load() {
		setStatus('loading');
		try {
			setRows(await fetchAdminBooks());
			setStatus('ready');
		} catch {
			// The API message can be raw (for example `Unauthorized`); the panel
			// answers in Spanish and offers a retry, like the projects panel.
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

	function startEdit(row: AdminBookRow) {
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
			await createBook(toBody(current));
			setAddForm(EMPTY_FORM);
			setNotice({
				scope: 'create',
				kind: 'saved',
				message: 'Libro agregado. La web lo muestra cuando lo publiques.',
			});
			await load();
		} catch (cause) {
			setNotice({
				scope: 'create',
				kind: 'error',
				message: 'No pudimos guardar el libro. Inténtalo de nuevo en unos minutos.',
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
			await updateBook(id, toBody(current));
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
			await deleteBook(id);
			setConfirmingId(null);
			if (editingId() === id) setEditingId(null);
			setNotice({
				scope: 'delete',
				kind: 'saved',
				message: 'Libro eliminado. La web ya no lo muestra.',
			});
			await load();
		} catch (cause) {
			setNotice({
				scope: 'delete',
				kind: 'error',
				message: 'No pudimos eliminar el libro. Inténtalo de nuevo en unos minutos.',
				detail: messageFrom(cause),
			});
		} finally {
			setDeletingId(null);
		}
	}

	async function handleUpload(id: number, file: File) {
		if (uploadingId() !== null) return;

		setUploadingId(id);
		setNotice(null);

		try {
			await uploadBookFile(id, file);
			setNotice({
				scope: 'upload',
				kind: 'saved',
				message: 'PDF subido. Ya se puede descargar desde la web.',
			});
			await load();
		} catch (cause) {
			setNotice({
				scope: 'upload',
				kind: 'error',
				message: 'No pudimos subir el PDF. Inténtalo de nuevo en unos minutos.',
				detail: messageFrom(cause),
			});
		} finally {
			setUploadingId(null);
		}
	}

	return (
		<div class="flex flex-col gap-8">
			<Show when={status() === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando los libros…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar los libros. Inténtalo de nuevo en unos minutos.
					</p>
					<button type="button" onClick={() => void load()} class={`${secondaryButtonClass} h-10 px-5 text-sm`}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={status() === 'ready'}>
				<section aria-labelledby="libros-nuevo" class="border border-border bg-card p-6">
					<h2 id="libros-nuevo" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
						NUEVO LIBRO
					</h2>
					<p class={hintClass}>
						Se agrega al final de la lista. Después podés subirle el PDF desde la lista.
					</p>
					<form onSubmit={handleCreate} class="mt-5 grid gap-5">
						<BookFields form={addForm()} prefix="book-new" onInput={updateAdd} />
						<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
							<button type="submit" disabled={creating()} class={primaryButtonClass}>
								{creating() ? 'Agregando…' : 'Agregar libro'}
							</button>
							<Feedback notice={noticeFor('create')} />
						</div>
					</form>
				</section>

				<section aria-labelledby="libros-lista" class="border border-border bg-card">
					<header class="flex flex-wrap items-baseline justify-between gap-4 border-b border-border px-6 py-4">
						<h2 id="libros-lista" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							LIBROS CARGADOS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{rows().length} {countLabel()}
						</p>
					</header>

					<Show when={noticeFor('upload')}>
						<div class="border-b border-border px-6 py-3">
							<Feedback notice={noticeFor('upload')} />
						</div>
					</Show>

					<Show when={noticeFor('delete')}>
						<div class="border-b border-border px-6 py-3">
							<Feedback notice={noticeFor('delete')} />
						</div>
					</Show>

					<Show
						when={rows().length > 0}
						fallback={
							<p class="px-6 py-6 text-sm text-muted-foreground">
								Todavía no hay libros cargados. En la web la sección queda con su estado vacío hasta que publiques uno.
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
															<p class="font-mincho text-xl font-semibold tracking-tight">{row.title}</p>
															<p class="mt-1 text-sm text-aka">{row.author}</p>
															<p class="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
																{row.description}
															</p>
														</div>
														<div class="flex shrink-0 flex-wrap items-center gap-2">
															<span class={badgeClass}>{statusLabel(row.status)}</span>
															<span class={badgeClass}>{kindLabel(row.kind)}</span>
															<span class={badgeClass}>
																{row.published === true ? 'Publicado' : 'Borrador'}
															</span>
														</div>
													</div>

													<Show when={row.review}>
														<blockquote class="mt-3 max-w-2xl border-l-2 border-aka/40 pl-4 text-sm italic leading-relaxed text-muted-foreground">
															{row.review}
														</blockquote>
													</Show>

													<BookFileUpload
														book={row}
														uploading={uploadingId() === row.id}
														onUpload={(file) => void handleUpload(row.id, file)}
													/>

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
																<span class="text-[12px] text-muted-foreground">
																	¿Eliminar este libro y su PDF?
																</span>
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
												aria-label={`Editar ${row.title}`}
											>
												<BookFields
													form={editForm()}
													prefix={`book-edit-${row.id}`}
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
