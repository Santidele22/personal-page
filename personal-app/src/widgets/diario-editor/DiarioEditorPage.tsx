import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { ApiBlog, ApiBlogLevel } from '../../entities/admin/types';
import {
	createPost,
	fetchEditorDrafts,
	fetchPublishedEntries,
	updatePost,
	type PostBody,
} from '../../features/diario-editor/api/post';
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
 */

type Props = {
	/** Entry id in edit mode; absent in create mode. */
	blogId?: number;
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

	const stateLabel = () => (form().pubDate ? 'Publicado' : 'Borrador');
	const savedLabel = () => {
		const at = savedAt();
		if (at === null) return '';

		const minutes = Math.max(0, Math.round((now() - at) / 60_000));
		return minutes < 1 ? 'guardado hace un instante' : `guardado hace ${minutes} min`;
	};

	async function save(asPublish: boolean) {
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
			<style>{`
				.editor-page { min-height: 100dvh; display: flex; flex-direction: column; background: var(--background); color: var(--foreground); font-family: var(--font-sans); }
				.editor-page button { font: inherit; cursor: pointer; }
				.editor-page textarea:focus { outline: none; }
				.editor-loading-state { min-height: 60dvh; display: flex; align-items: center; justify-content: center; padding: 24px; }
				.editor-loading-text { color: var(--muted-foreground); font-size: 14px; letter-spacing: 0.08em; }
				.editor-error-box { border: 1px solid var(--border); background: var(--card); padding: 24px; display: flex; flex-direction: column; gap: 12px; }
				.editor-error-back { color: var(--muted-foreground); font-size: 13px; }
				.editor-error-back:hover { color: var(--aka); }
				.chrome { display: flex; align-items: center; gap: 16px; padding: 12px 24px; border-bottom: 1px solid var(--border); flex: none; flex-wrap: wrap; }
				.back { font-size: 13px; color: var(--muted-foreground); text-decoration: none; transition: color 0.2s; }
				.back:hover { color: var(--aka); }
				.doc-state { font-size: 12px; color: var(--muted-foreground); display: flex; align-items: center; gap: 8px; }
				.doc-state .dot { width: 7px; height: 7px; border-radius: 9999px; background: var(--aka); flex: none; }
				.chrome .spacer { flex: 1; }
				.btn-secondary { border: 1px solid var(--border); background: var(--card); color: var(--foreground); border-radius: 6px; padding: 8px 18px; font-size: 13px; transition: 0.2s; }
				.btn-secondary:hover { border-color: var(--aka); color: var(--aka); }
				.btn-primary { border: 0; border-radius: 6px; background: var(--foreground); color: var(--background); padding: 8px 20px; font-size: 13px; font-weight: 500; transition: 0.2s; }
				.btn-primary:hover { background: var(--aka); color: #fdf8ee; }
				.meta-bar { display: flex; gap: 16px; padding: 10px 24px; border-bottom: 1px solid var(--border); flex: none; flex-wrap: wrap; }
				.meta-bar input { border: 0; background: none; font: inherit; color: var(--foreground); font-size: 14px; min-width: 0; }
				.meta-bar input:focus-visible { outline: 2px solid var(--aka); outline-offset: 2px; }
				.meta-bar .title { flex: 2; min-width: 240px; font-family: var(--font-mincho); font-weight: 600; }
				.meta-bar .desc { flex: 2; min-width: 240px; color: var(--muted-foreground); font-size: 13px; }
				.save-alert { flex: none; border-bottom: 1px solid var(--border); padding: 8px 24px; font-size: 13px; color: var(--aka); background: color-mix(in oklab, var(--aka) 8%, transparent); }
				.split { flex: 1; display: grid; grid-template-columns: 1fr 1fr; min-height: 0; }
				.pane { display: flex; flex-direction: column; min-height: 0; }
				.pane.left { position: relative; border-right: 1px solid var(--border); }
				.toolbar { display: flex; align-items: center; gap: 4px; padding: 8px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; flex: none; }
				.tb { min-width: 30px; height: 30px; padding: 0 7px; border: 1px solid transparent; background: none; color: var(--foreground); border-radius: 6px; font-size: 12.5px; font-weight: 500; transition: 0.15s; opacity: 0.75; }
				.tb:hover { border-color: var(--border); color: var(--foreground); opacity: 1; }
				.tb-sep { width: 1px; height: 20px; background: var(--border); margin: 0 6px; }
				.tb-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-foreground); margin: 0 4px 0 8px; }
				.swatch { width: 16px; height: 16px; border-radius: 9999px; border: 2px solid transparent; padding: 0; }
				.swatch:hover { border-color: var(--foreground); }
				.editor { flex: 1; min-height: 0; border: 0; resize: none; padding: 20px 22px; background: var(--card); color: var(--foreground); font-family: var(--font-mono); font-size: 13px; line-height: 1.75; width: 100%; }
				.statusbar { flex: none; display: flex; gap: 16px; padding: 7px 16px; border-top: 1px solid var(--border); font-size: 11px; color: var(--muted-foreground); flex-wrap: wrap; }
				.preview-head { flex: none; display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--border); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-foreground); }
				.preview { flex: 1; min-height: 0; overflow-y: auto; padding: 24px 28px 80px; }
				.preview h1 { font-family: var(--font-mincho); font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin: 22px 0 10px; }
				.preview h2 { font-family: var(--font-mincho); font-size: 21px; font-weight: 600; margin: 20px 0 8px; }
				.preview h3 { font-family: var(--font-mincho); font-size: 17px; font-weight: 600; margin: 16px 0 6px; }
				.preview p { font-size: 15px; line-height: 1.85; color: var(--foreground); opacity: 0.9; margin: 10px 0; }
				.preview blockquote { border-left: 3px solid var(--aka); padding-left: 16px; margin: 14px 0; font-family: var(--font-mincho); font-size: 16px; }
				.preview blockquote p { font-size: 16px; margin: 4px 0; }
				.preview ul, .preview ol { padding-left: 22px; margin: 10px 0; font-size: 15px; line-height: 1.85; opacity: 0.9; }
				.preview pre { background: var(--foreground); color: var(--background); border-radius: 6px; padding: 14px 16px; font-family: var(--font-mono); font-size: 12.5px; line-height: 1.6; overflow-x: auto; margin: 14px 0; }
				.preview pre code { color: inherit; font-size: inherit; }
				.preview code { font-family: var(--font-mono); font-size: 0.9em; }
				.preview img { max-width: 100%; height: auto; border-radius: 6px; }
				.preview .c-aka { color: var(--aka); }
				.preview .c-muted { color: var(--muted-foreground); }
				.meta-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 26; width: min(300px, 88vw); background: var(--card); border-left: 1px solid var(--border); padding: 20px; transform: translateX(100%); transition: transform 0.25s ease; overflow-y: auto; }
				.meta-drawer.open { transform: none; }
				.meta-drawer h2 { font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted-foreground); display: flex; justify-content: space-between; align-items: center; }
				.drawer-close { border: 0; background: none; color: var(--muted-foreground); font-size: 15px; }
				.drawer-close:hover { color: var(--aka); }
				.field { margin-top: 20px; }
				.field label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 8px; }
				.segmented { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
				.segmented button { flex: 1; border: 0; background: none; padding: 7px 4px; font-size: 12px; color: var(--muted-foreground); transition: 0.15s; }
				.segmented button.active { background: var(--foreground); color: var(--background); }
				.chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
				.chip-x { display: inline-flex; align-items: center; gap: 5px; border-radius: 3px; background: var(--secondary); padding: 3px 8px; font-size: 11px; font-weight: 500; }
				.chip-x button { border: 0; background: none; color: var(--muted-foreground); font-size: 11px; padding: 0; }
				.chip-x button:hover { color: var(--aka); }
				.chip-input { border: 0; background: none; font: inherit; font-size: 12px; color: var(--foreground); min-width: 80px; flex: 1; }
				.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; }
				.switch { position: relative; width: 36px; height: 20px; border-radius: 9999px; border: 1px solid var(--border); background: var(--muted); cursor: pointer; transition: 0.2s; flex: none; }
				.switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 9999px; background: var(--muted-foreground); transition: 0.2s; }
				.switch.on { background: var(--aka); border-color: var(--aka); }
				.switch.on::after { left: 18px; background: #fdf8ee; }
				.auto-value { font-size: 13px; color: var(--foreground); }
				.auto-note { font-size: 11px; color: var(--muted-foreground); margin-top: 4px; }
				.slug-value { font-family: var(--font-mono); font-size: 11.5px; color: var(--muted-foreground); word-break: break-all; }
				.slash-menu { position: absolute; z-index: 30; width: 230px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 16px 40px -16px rgba(0, 0, 0, 0.3); padding: 6px; display: none; }
				.slash-menu.open { display: block; }
				.slash-title { padding: 6px 10px 4px; font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-foreground); }
				.slash-item { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: none; padding: 7px 10px; border-radius: 6px; font-size: 13px; color: var(--foreground); text-align: left; }
				.slash-item:hover, .slash-item.active { background: var(--secondary); }
				.slash-item .ico { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 5px; font-size: 12px; color: var(--aka); flex: none; }
				.slash-item small { display: block; font-size: 10.5px; color: var(--muted-foreground); }
				.drop-overlay { position: absolute; inset: 0; z-index: 25; display: none; align-items: center; justify-content: center; background: color-mix(in oklab, var(--background) 82%, transparent); border: 2px dashed var(--aka); border-radius: 4px; font-size: 14px; color: var(--aka); pointer-events: none; }
				.drop-overlay.show { display: flex; }
				.upload-toast { position: absolute; left: 16px; bottom: 40px; z-index: 27; display: none; align-items: center; gap: 10px; background: var(--foreground); color: var(--background); border-radius: 8px; padding: 9px 14px; font-size: 12.5px; }
				.upload-toast.show { display: flex; }
				.upload-toast.error-toast { background: var(--aka); color: #fdf8ee; }
				.upload-toast .bar { width: 90px; height: 4px; border-radius: 9999px; background: color-mix(in oklab, var(--background) 25%, transparent); overflow: hidden; }
				.upload-toast .bar i { display: block; height: 100%; background: var(--aka); transition: width 0.3s; }
				@media (max-width: 900px) { .split { grid-template-columns: 1fr; } .pane.right { display: none; } }
				@media (prefers-reduced-motion: reduce) { .editor-page *, .meta-drawer, .drop-overlay { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
			`}</style>

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
					<a class="back" href="/admin/diario">
						← Diario
					</a>
					<span class="doc-state">
						<span class="dot" aria-hidden="true" />
						{stateLabel()}
						<Show when={savedLabel()}>
							<span>· {savedLabel()}</span>
						</Show>
					</span>
					<span class="spacer" />
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
					<input
						type="date"
						aria-label="Fecha de publicación (vacía = borrador)"
						value={form().pubDate}
						onInput={(event) => update('pubDate', event.currentTarget.value)}
					/>
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
		</div>
	);
}
