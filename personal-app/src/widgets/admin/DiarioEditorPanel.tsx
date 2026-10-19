import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { toDiarioPosts } from '../../entities/admin/adapter';
import type { AdminSummaryStat, ApiBlog } from '../../entities/admin/types';
import { fetchBlogs } from '../../features/admin/api/collections';
import { createBlogEntry, updateBlogEntry } from '../../features/admin/api/diario';
import { loadDiarioPanel } from '../../features/admin/api/dashboards';

/**
 * Diario panel island (issue 29). The published table stays server-rendered in
 * the page; this island owns everything the server render cannot know because
 * it needs the browser session cookie: the drafts read, the live summary with
 * the real draft count, and the writing modal.
 *
 * The page's "+ Nueva entrada" button lives in the server-rendered header, so
 * the island binds to it on mount. Every mutation reloads the page, which keeps
 * the server table and this island honest with storage on the same pass.
 */

type Status = 'loading' | 'ready' | 'error';
type ModalMode = 'create' | 'edit';
type Pending = 'draft' | 'publish' | 'row' | null;

type FormState = {
	title: string;
	description: string;
	content: string;
	/** `yyyy-mm-dd`; empty means "save as draft". */
	pubDate: string;
};

const EMPTY_FORM: FormState = { title: '', description: '', content: '', pubDate: '' };

/** Server-rendered button in `pages/admin/diario.astro`. */
const TRIGGER_ID = 'nueva-entrada';

/**
 * Document event the server-rendered published table publishes from its «Editar»
 * action (`widgets/admin/AdminPostTable.astro`). It lets that button reach this
 * island's modal without the table importing the island; the payload is the row
 * id, the only handle the server render carries.
 */
const OPEN_EDITOR_EVENT = 'diario:open-editor';

const DOT_CLASS: Record<AdminSummaryStat['dot'], string> = {
	neutral: 'bg-foreground/60',
	hollow: 'border border-muted-foreground',
	aka: 'bg-aka',
};

const labelClass = 'block text-[11px] font-medium tracking-[0.2em] text-muted-foreground';
const inputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const hintClass = 'mt-1.5 text-[11px] leading-relaxed text-muted-foreground';
const primaryButtonClass =
	'inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';
const badgeClass =
	'inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground';
const headClass = 'py-4 text-[11px] font-medium tracking-[0.2em] text-muted-foreground';
const cellClass = 'py-4';

/** UTC date of the browser day, the same `yyyy-mm-dd` the date input emits. */
function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

function sameForm(a: FormState, b: FormState): boolean {
	return a.title === b.title && a.description === b.description && a.content === b.content && a.pubDate === b.pubDate;
}

/** The API message when there is one; the modal would rather show it raw. */
function messageFrom(cause: unknown): string {
	return cause instanceof Error && cause.message ? cause.message : '';
}

type FieldProps = {
	id: string;
	label: string;
	value: string;
	hint?: string;
	placeholder?: string;
	multiline?: boolean;
	rows?: number;
	type?: 'text' | 'date';
	onInput: (value: string) => void;
};

/** One labelled input/textarea, shared by the modal fields. */
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

export default function DiarioEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [stats, setStats] = createSignal<AdminSummaryStat[]>([]);
	const [drafts, setDrafts] = createSignal<ApiBlog[]>([]);
	const [loadDetail, setLoadDetail] = createSignal('');
	const [actionError, setActionError] = createSignal('');

	const [open, setOpen] = createSignal(false);
	const [mode, setMode] = createSignal<ModalMode>('create');
	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [baseline, setBaseline] = createSignal<FormState>(EMPTY_FORM);
	const [form, setForm] = createSignal<FormState>(EMPTY_FORM);
	const [pending, setPending] = createSignal<Pending>(null);
	const [modalError, setModalError] = createSignal('');

	const draftPosts = () => toDiarioPosts(drafts());
	const draftById = (id: string) => drafts().find((draft) => String(draft.id) === id);

	async function load() {
		setStatus('loading');
		setLoadDetail('');
		setActionError('');

		try {
			const data = await loadDiarioPanel();
			setStats(data.stats);
			setDrafts(data.drafts);
			setStatus('ready');
		} catch (cause) {
			setLoadDetail(messageFrom(cause));
			setStatus('error');
		}
	}

	onMount(() => {
		void load();

		const trigger = document.getElementById(TRIGGER_ID);
		const onTrigger = () => openCreate();
		trigger?.addEventListener('click', onTrigger);

		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && open()) closeModal();
		};
		document.addEventListener('keydown', onKey);

		// Bridge for the published table's «Editar»: the row id arrives in the
		// event detail and the full entry is read before opening the modal.
		const onOpenEditor = (event: Event) => {
			const id = (event as CustomEvent<{ id?: string }>).detail?.id;

			if (id) void openPublished(id);
		};
		document.addEventListener(OPEN_EDITOR_EVENT, onOpenEditor);

		onCleanup(() => {
			trigger?.removeEventListener('click', onTrigger);
			document.removeEventListener('keydown', onKey);
			document.removeEventListener(OPEN_EDITOR_EVENT, onOpenEditor);
		});
	});

	function openCreate() {
		setMode('create');
		setEditingId(null);
		setBaseline(EMPTY_FORM);
		setForm(EMPTY_FORM);
		setModalError('');
		setOpen(true);
	}

	function openEdit(draft: ApiBlog) {
		const next: FormState = {
			title: draft.title,
			description: draft.description,
			content: draft.content,
			pubDate: '',
		};

		setMode('edit');
		setEditingId(draft.id);
		setBaseline(next);
		setForm(next);
		setModalError('');
		setOpen(true);
	}

	function closeModal() {
		if (pending() !== null) return;
		setOpen(false);
	}

	/**
	 * Opens the modal for a published entry. The published table carries only the
	 * row id, so the full entry is read from the public list first and then handed
	 * to `openEdit`, the exact path the drafts table already uses.
	 */
	async function openPublished(id: string) {
		setActionError('');

		try {
			const blogs = await fetchBlogs();
			const blog = blogs.find((entry) => String(entry.id) === id);

			if (blog) openEdit(blog);
			else setActionError('No se encontró la entrada para editar.');
		} catch (cause) {
			setActionError(messageFrom(cause) || 'No se pudo abrir la entrada para editar.');
		}
	}

	function update<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	const requiredReady = () => {
		const current = form();

		return Boolean(current.title.trim() && current.description.trim() && current.content.trim());
	};

	const changed = () => !sameForm(form(), baseline());
	const canSaveDraft = () => pending() === null && requiredReady() && changed();
	/** Publishing needs the date that makes the entry visible on the landing. */
	const canPublish = () => canSaveDraft() && form().pubDate !== '';

	function body(includeDate: boolean) {
		const current = form();

		return {
			title: current.title.trim(),
			description: current.description.trim(),
			content: current.content,
			...(includeDate ? { pubDate: current.pubDate } : {}),
		};
	}

	async function submit(asPublish: boolean) {
		if (asPublish ? !canPublish() : !canSaveDraft()) return;

		setPending(asPublish ? 'publish' : 'draft');
		setModalError('');

		try {
			const id = editingId();

			if (id === null) {
				await createBlogEntry(body(asPublish));
			} else {
				await updateBlogEntry(id, body(asPublish));
			}

			// Honest refresh: the server table (published) and this island
			// (drafts + summary) both re-read storage on the same reload.
			window.location.reload();
		} catch (cause) {
			setModalError(messageFrom(cause) || 'No se pudo guardar la entrada. Inténtalo de nuevo.');
			setPending(null);
		}
	}

	async function publishDraft(draft: ApiBlog) {
		if (pending() !== null) return;

		setPending('row');
		setActionError('');

		try {
			await updateBlogEntry(draft.id, { pubDate: todayIso() });
			window.location.reload();
		} catch (cause) {
			setActionError(messageFrom(cause) || 'No se pudo publicar el borrador. Inténtalo de nuevo.');
			setPending(null);
		}
	}

	return (
		<div class="flex flex-col gap-8">
			<Show when={status() === 'loading'}>
				<p role="status" class="border border-border bg-card p-6 text-sm text-muted-foreground">
					Cargando los borradores…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar los borradores del panel. Revisá la sesión del admin e inténtalo de nuevo.
					</p>
					<Show when={loadDetail()}>
						<p class="font-mono text-[11px] leading-relaxed text-destructive">{loadDetail()}</p>
					</Show>
					<button type="button" onClick={() => void load()} class={`${secondaryButtonClass} h-10 px-5 text-sm`}>
						Reintentar
					</button>
				</div>
			</Show>

			<Show when={status() === 'ready'}>
				<section aria-label="Resumen de entradas" class="border border-border bg-card px-6 py-4">
					<p class="flex flex-wrap items-baseline gap-x-8 gap-y-2">
						<For each={stats()}>
							{(stat) => (
								<span class="flex items-baseline gap-3">
									<span class={`size-1.5 rounded-full ${DOT_CLASS[stat.dot]}`} aria-hidden="true" />
									<span class="font-mincho text-2xl font-semibold">{stat.value}</span>
									<span class="text-sm text-muted-foreground">{stat.label}</span>
								</span>
							)}
						</For>
					</p>
				</section>

				<section aria-labelledby="diario-borradores" class="overflow-hidden border border-border bg-card">
					<header class="flex flex-wrap items-baseline justify-between gap-4 border-b border-border px-6 py-4">
						<h2 id="diario-borradores" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							BORRADORES
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{drafts().length} {drafts().length === 1 ? 'borrador' : 'borradores'}
						</p>
					</header>

					<Show when={actionError()}>
						<div class="border-b border-border px-6 py-3">
							<p role="alert" class="text-sm text-destructive">
								{actionError()}
							</p>
						</div>
					</Show>

					<Show
						when={drafts().length > 0}
						fallback={
							<p class="px-6 py-6 text-sm text-muted-foreground">
								No hay borradores abiertos. Todo lo que escribas sin fecha queda acá hasta que lo publiques.
							</p>
						}
					>
						<div class="overflow-x-auto">
							<table class="w-full min-w-[680px] text-left text-sm">
								<caption class="sr-only">Borradores del diario con su estado y fecha de guardado</caption>
								<thead>
									<tr class="border-b border-border">
										<th scope="col" class={`${headClass} px-6`}>
											ENTRADA
										</th>
										<th scope="col" class={`${headClass} px-4`}>
											ESTADO
										</th>
										<th scope="col" class={`${headClass} px-4`}>
											FECHA
										</th>
										<th scope="col" class={`${headClass} px-6 text-right`}>
											ACCIONES
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border">
									<For each={draftPosts()}>
										{(post) => {
											const draft = draftById(post.id);

											return (
												<tr class="group transition-colors hover:bg-secondary/50">
													<th scope="row" class={`${cellClass} max-w-sm px-6 font-sans font-normal`}>
														<span class="block truncate font-medium">{post.title}</span>
														<span class="mt-0.5 block font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
															{post.category}
														</span>
													</th>
													<td class={`${cellClass} whitespace-nowrap px-4`}>
														<span class="flex items-center gap-2">
															<span class="size-1.5 rounded-full border border-muted-foreground" aria-hidden="true" />
															<span class={badgeClass}>Borrador</span>
														</span>
													</td>
													<td class={`${cellClass} whitespace-nowrap px-4 font-mono text-[13px] text-muted-foreground`}>
														{post.date}
													</td>
													<td class={`${cellClass} px-6 text-right`}>
														<span class="inline-flex flex-wrap items-center justify-end gap-2">
															<button
																type="button"
																onClick={() => draft && openEdit(draft)}
																class={secondaryButtonClass}
															>
																Editar
															</button>
															<button
																type="button"
																disabled={pending() !== null}
																onClick={() => draft && void publishDraft(draft)}
																class={secondaryButtonClass}
															>
																{pending() === 'row' ? 'Publicando…' : 'Publicar'}
															</button>
														</span>
													</td>
												</tr>
											);
										}}
									</For>
								</tbody>
							</table>
						</div>
					</Show>
				</section>
			</Show>

			{/*
				The dialog stays mounted (hidden while closed) so the markup is
				part of the server render and a first paint can verify it; the
				trigger only flips its visibility.
			*/}
			<div
				class={
					open()
						? 'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm sm:p-8'
						: 'hidden'
				}
				aria-hidden={open() ? undefined : 'true'}
				onClick={(event) => {
					if (event.target === event.currentTarget) closeModal();
				}}
			>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="diario-modal-title"
						class="my-auto w-full max-w-2xl border border-border bg-card p-6 shadow-xl"
					>
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-[11px] font-medium tracking-[0.3em] text-muted-foreground">
									{mode() === 'create' ? 'NUEVA ENTRADA' : 'EDITAR BORRADOR'}
								</p>
								<h2 id="diario-modal-title" class="mt-2 font-mincho text-2xl font-semibold tracking-tight">
									{mode() === 'create' ? 'Escribir en el diario' : 'Editar el borrador'}
								</h2>
							</div>
							<button
								type="button"
								disabled={pending() !== null}
								onClick={closeModal}
								aria-label="Cerrar"
								class={`${secondaryButtonClass} size-9 shrink-0 p-0 text-base`}
							>
								×
							</button>
						</div>

						<form
							class="mt-5 grid gap-5"
							onSubmit={(event) => {
								event.preventDefault();
								void submit(false);
							}}
						>
							<Field
								id="diario-title"
								label="TÍTULO"
								value={form().title}
								placeholder="De qué trata la entrada"
								hint="El título también deriva la URL pública de la entrada."
								onInput={(value) => update('title', value)}
							/>

							<Field
								id="diario-pubdate"
								type="date"
								label="FECHA DE PUBLICACIÓN"
								value={form().pubDate}
								hint="Vacía = se guarda como borrador. Con fecha, «Publicar» la muestra en la landing al recargar."
								onInput={(value) => update('pubDate', value)}
							/>

							<Field
								id="diario-description"
								label="DESCRIPCIÓN"
								value={form().description}
								multiline
								rows={3}
								placeholder="El resumen corto que aparece en la portada"
								onInput={(value) => update('description', value)}
							/>

							<Field
								id="diario-content"
								label="CONTENIDO (MARKDOWN)"
								value={form().content}
								multiline
								rows={11}
								placeholder={'Escribí acá la entrada.\n\n## Un subtítulo\n\nPárrafos, listas y bloques de código en markdown.'}
								onInput={(value) => update('content', value)}
							/>

							<Show when={modalError()}>
								<p role="alert" class="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
									{modalError()}
								</p>
							</Show>

							<div class="flex flex-wrap items-center gap-3 border-t border-border pt-5">
								<button type="submit" disabled={!canSaveDraft()} class={secondaryButtonClass}>
									{pending() === 'draft' ? 'Guardando…' : 'Guardar borrador'}
								</button>
								<button
									type="button"
									disabled={!canPublish()}
									onClick={() => void submit(true)}
									class={primaryButtonClass}
								>
									{pending() === 'publish' ? 'Publicando…' : 'Publicar'}
								</button>
								<button
									type="button"
									disabled={pending() !== null}
									onClick={closeModal}
									class={`${secondaryButtonClass} ml-auto`}
								>
									Cancelar
								</button>
							</div>
						</form>
					</div>
				</div>
		</div>
	);
}
