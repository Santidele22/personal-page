import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { ApiBlog, ApiBlogLevel } from '../../entities/admin/types';
import {
	createPost,
	fetchEditorDrafts,
	fetchPublishedEntries,
	updatePost,
	type PostBody,
} from '../../features/diario-editor/api/post';
import {
	fetchManifesto,
	MANIFIESTO_CONTENT,
	MANIFIESTO_DESCRIPTION,
	MANIFIESTO_TITLE,
	saveManifesto,
} from '../../features/manifiesto/api';
import { readMinutes } from '../../features/diario-editor/lib/editorStats';
import { slugPreviewPath } from '../../features/diario-editor/lib/slug';
import type { EditResult } from '../../features/diario-editor/lib/selection';
import { renderMarkdown } from '../../shared/lib/markdown';
import EditorPane from './EditorPane';
import MetadataDrawer from './MetadataDrawer';

/**
 * Full-page diario editor (design artboard 02, markdown split): dedicated
 * route outside the admin modal and the AdminLayout max-width, 100% of the
 * viewport. `/admin/diario/nueva` mounts it without `blogId`; the edit route
 * passes the entry id and the island loads the entry in the browser because
 * drafts need the admin session cookie.
 *
 * `mode: 'manifesto'` reuses the exact same editor for the `/manifiesto`
 * singleton article (codex-copy S6): no date, no metadata drawer and a
 * single save button — saving is publishing for that page.
 */

type Props = {
	/** Entry id in edit mode; absent in create mode. */
	blogId?: number;
	/** `'post'` (default) edits a diario entry; `'manifesto'` the singleton article. */
	mode?: 'post' | 'manifesto';
};

type EditorForm = {
	title: string;
	description: string;
	content: string;
	/** `yyyy-mm-dd`; empty keeps the entry a draft. */
	pubDate: string;
	level: ApiBlogLevel;
	/** Drawer chips; the backend stores them joined with `, `. */
	categories: string[];
	featured: boolean;
};

const EMPTY_FORM: EditorForm = {
	title: '',
	description: '',
	content: '',
	pubDate: '',
	level: 'basico',
	categories: [],
	featured: false,
};

const primaryButtonClass =
	'inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';

function errorText(cause: unknown): string {
	return cause instanceof Error && cause.message ? cause.message : '';
}

/** Live preview: the same sanitized renderer the published article uses
 * (`renderMarkdown` accepts the palette spans since the allowlist change). */
function previewHtml(content: string): string {
	return renderMarkdown(content);
}

function sameForm(a: EditorForm, b: EditorForm): boolean {
	return (
		a.title === b.title &&
		a.description === b.description &&
		a.content === b.content &&
		a.pubDate === b.pubDate &&
		a.level === b.level &&
		a.featured === b.featured &&
		a.categories.join(', ') === b.categories.join(', ')
	);
}

function formFromApi(blog: ApiBlog): EditorForm {
	return {
		title: blog.title,
		description: blog.description,
		content: blog.content,
		pubDate: blog.pubDate ? blog.pubDate.slice(0, 10) : '',
		level: blog.level,
		categories: (blog.category ?? '')
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean),
		featured: blog.featured === true,
	};
}

export default function DiarioEditorPage(props: Props) {
	const [status, setStatus] = createSignal<'loading' | 'ready' | 'error'>('loading');
	const [loadError, setLoadError] = createSignal('');
	const [entryId, setEntryId] = createSignal<number | null>(props.blogId ?? null);
	const [form, setForm] = createSignal<EditorForm>(EMPTY_FORM);
	const [baseline, setBaseline] = createSignal<EditorForm>(EMPTY_FORM);
	const [saving, setSaving] = createSignal<'draft' | 'publish' | null>(null);
	const [saveError, setSaveError] = createSignal('');
	const [savedAt, setSavedAt] = createSignal<number | null>(null);
	const [drawerOpen, setDrawerOpen] = createSignal(false);
	/* 30 s ticker so «guardado hace N min» stays honest while the tab sits open. */
	const [now, setNow] = createSignal(Date.now());

	onMount(() => {
		const tick = setInterval(() => setNow(Date.now()), 30_000);
		onCleanup(() => clearInterval(tick));
		void load();
	});

	function update<K extends keyof EditorForm>(key: K, value: EditorForm[K]) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	async function load() {
		setStatus('loading');
		setLoadError('');
		setSavedAt(null);

		if (props.mode === 'manifesto') {
			const stored = await fetchManifesto();
			const manifestoForm: EditorForm = {
				title: stored?.title ?? MANIFIESTO_TITLE,
				description: stored?.description ?? MANIFIESTO_DESCRIPTION,
				content: stored?.content ?? MANIFIESTO_CONTENT,
				pubDate: '',
				level: 'basico',
				categories: [],
				featured: false,
			};
			setEntryId(null);
			setForm(manifestoForm);
			setBaseline(manifestoForm);
			setStatus('ready');
			return;
		}

		if (props.blogId === undefined) {
			setEntryId(null);
			setForm(EMPTY_FORM);
			setBaseline(EMPTY_FORM);
			setStatus('ready');
			return;
		}

		let blog: ApiBlog | undefined;
		let firstError = '';

		try {
			const drafts = await fetchEditorDrafts();
			blog = drafts.find((entry) => entry.id === props.blogId);
		} catch (cause) {
			firstError = errorText(cause);
		}
		if (!blog) {
			try {
				const published = await fetchPublishedEntries();
				blog = published.find((entry) => entry.id === props.blogId);
			} catch (cause) {
				setLoadError(firstError || errorText(cause) || 'No se pudieron leer las entradas.');
				setStatus('error');
				return;
			}
		}
		if (!blog) {
			setLoadError(firstError || 'No se encontró la entrada para editar.');
			setStatus('error');
			return;
		}

		setEntryId(blog.id);
		setForm(formFromApi(blog));
		setBaseline(formFromApi(blog));
		setStatus('ready');
	}

	const requiredReady = () => {
		const current = form();

		return Boolean(current.title.trim() && current.description.trim() && current.content.trim());
	};

	const changed = () => !sameForm(form(), baseline());
	const canSaveDraft = () => saving() === null && requiredReady() && changed();
	/** Publishing needs the date that makes the entry visible on the landing. */
	const canPublish = () => canSaveDraft() && form().pubDate !== '';

	const stateLabel = () => {
		if (props.mode === 'manifesto') return 'Manifiesto';
		return form().pubDate ? 'Publicado' : 'Borrador';
	};
	const savedLabel = () => {
		const at = savedAt();
		if (at === null) return '';

		const minutes = Math.max(0, Math.round((now() - at) / 60_000));
		return minutes < 1 ? 'guardado hace un instante' : `guardado hace ${minutes} min`;
	};

	async function save(asPublish: boolean) {
		if (props.mode === 'manifesto') {
			if (!canSaveDraft()) return;
			setSaving('draft');
			setSaveError('');
			const current = form();
			try {
				await saveManifesto({
					title: current.title.trim(),
					description: current.description.trim(),
					content: current.content,
				});
				setBaseline(current);
				setSavedAt(Date.now());
			} catch (cause) {
				setSaveError(errorText(cause) || 'No se pudo guardar el manifiesto. Inténtalo de nuevo.');
			} finally {
				setSaving(null);
			}
			return;
		}

		if (asPublish ? !canPublish() : !canSaveDraft()) return;

		setSaving(asPublish ? 'publish' : 'draft');
		setSaveError('');

		const current = form();
		const body: PostBody = {
			title: current.title.trim(),
			description: current.description.trim(),
			content: current.content,
			level: current.level,
			featured: current.featured,
			readMin: readMinutes(current.content),
		};
		if (current.categories.length > 0) body.category = current.categories.join(', ');
		if (asPublish && current.pubDate !== '') body.pubDate = current.pubDate;

		try {
			const id = entryId();

			if (id === null) {
				const created = await createPost(body);
				// Same honest-refresh rule as the panel: the following navigation
				// makes the list and the server table re-read storage.
				window.location.assign(`/admin/diario/${created.id}`);
				return;
			}

			await updatePost(id, body);
			setBaseline(current);
			setSavedAt(Date.now());
		} catch (cause) {
			setSaveError(errorText(cause) || 'No se pudo guardar la entrada. Inténtalo de nuevo.');
		} finally {
			setSaving(null);
		}
	}

	/** Applies an editor transform to the content field. */
	const applyEditorEdit = (result: EditResult) => update('content', result.text);

	return (
		<div class="editor-page">

			<Show
				when={status() === 'ready'}
				fallback={
					<div class="editor-loading-state">
						<Show when={status() === 'loading'}>
							<p role="status" class="editor-loading-text">
								Abriendo el editor…
							</p>
						</Show>
						<Show when={status() === 'error'}>
							<div role="alert" class="editor-error-box">
								<p class="text-sm text-foreground">{loadError() || 'No se pudo abrir el editor.'}</p>
								<a class="editor-error-back" href="/admin/diario">
									← Volver a Diario
								</a>
							</div>
						</Show>
					</div>
				}
			>
				<header class="chrome">
					<a class="back" href={props.mode === 'manifesto' ? '/admin/' : '/admin/diario'}>
						{props.mode === 'manifesto' ? '← Panel' : '← Diario'}
					</a>
					<span class="doc-state">
						<span class="dot" aria-hidden="true" />
						{stateLabel()}
						<Show when={savedLabel()}>
							<span>· {savedLabel()}</span>
						</Show>
					</span>
					<span class="spacer" />
					<Show
						when={props.mode === 'manifesto'}
						fallback={
							<>
								<button type="button" class="btn-secondary" onClick={() => setDrawerOpen((open) => !open)}>
									⚙ Metadatos
								</button>
								<button type="button" class="btn-secondary" disabled={!canSaveDraft()} onClick={() => void save(false)}>
									<Show when={saving() === 'draft'} fallback="Guardar borrador">
										Guardando…
									</Show>
								</button>
								<button type="button" class="btn-primary" disabled={!canPublish()} onClick={() => void save(true)}>
									<Show when={saving() === 'publish'} fallback="Publicar">
										Publicando…
									</Show>
								</button>
							</>
						}
					>
						<button type="button" class="btn-primary" disabled={!canSaveDraft()} onClick={() => void save(false)}>
							<Show when={saving() === 'draft'} fallback="Guardar manifiesto">
								Guardando…
							</Show>
						</button>
					</Show>
				</header>

				<div class="meta-bar">
					<input
						class="title"
						type="text"
						aria-label="Título"
						placeholder="De qué trata la entrada"
						value={form().title}
						onInput={(event) => update('title', event.currentTarget.value)}
					/>
					<input
						class="desc"
						type="text"
						aria-label="Descripción"
						placeholder="El resumen corto que aparece en la portada"
						value={form().description}
						onInput={(event) => update('description', event.currentTarget.value)}
					/>
					<Show when={props.mode !== 'manifesto'}>
						<input
							type="date"
							aria-label="Fecha de publicación (vacía = borrador)"
							value={form().pubDate}
							onInput={(event) => update('pubDate', event.currentTarget.value)}
						/>
					</Show>
				</div>

				<Show when={saveError()}>
					<p role="alert" class="save-alert">
						{saveError()}
					</p>
				</Show>

				<div class="split">
					<EditorPane content={() => form().content} onEdit={applyEditorEdit} />
					<div class="pane right">
						<p class="preview-head">Vista previa · como se va a leer</p>
						<article class="preview" innerHTML={previewHtml(form().content)} />
					</div>
				</div>

				<Show when={props.mode !== 'manifesto'}>
					<MetadataDrawer
						open={() => drawerOpen()}
						onClose={() => setDrawerOpen(false)}
						level={() => form().level}
						onSelectLevel={(level) => update('level', level)}
						categories={() => form().categories}
						onAddCategory={(raw) =>
							setForm((current) =>
								current.categories.includes(raw)
									? current
									: { ...current, categories: [...current.categories, raw] }
							)
						}
						onRemoveCategory={(index) =>
							setForm((current) => ({
								...current,
								categories: current.categories.filter((_, at) => at !== index),
							}))
						}
						featured={() => form().featured}
						onToggleFeatured={() => update('featured', !form().featured)}
						readMin={() => readMinutes(form().content)}
						slugPath={() => slugPreviewPath(form().title)}
					/>
				</Show>
			</Show>
		</div>
	);
}
