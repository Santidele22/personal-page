import { createSignal, For, Show } from 'solid-js';
import type { JSXElement } from 'solid-js';
import { uploadBlogImage } from '../../features/diario-editor/api/images';
import { countLines, countWords, readMinutes } from '../../features/diario-editor/lib/editorStats';
import {
	insertLinePrefix,
	replaceRange,
	slashTarget,
	wrapSelection,
	type EditResult,
} from '../../features/diario-editor/lib/selection';

/**
 * Left pane of the split editor: toolbar that wraps the selection, the
 * markdown textarea, statusbar counters, the `/` slash menu and the image
 * drop zone. All text transforms come from the tested pure helpers in
 * `features/diario-editor/lib/selection`; this component is the DOM glue.
 */

type Props = {
	/** Reactive editor content owned by the page. */
	content: () => string;
	/** Applies a transform result (text + caret) to the form content. */
	onEdit: (result: EditResult) => void;
	/** Typing: the textarea is uncontrolled, so every keystroke must flow
	    into the page's form — otherwise the preview, the counters and the
	    saved text keep the original (a real bug this fixes). */
	onType: (text: string) => void;
};

const PREFIX_BUTTONS: { prefix: string; label: JSXElement }[] = [
	{ prefix: '## ', label: 'H2' },
	{ prefix: '### ', label: 'H3' },
	{ prefix: '> ', label: '❝' },
	{ prefix: '- ', label: '• Lista' },
];

const WRAP_BUTTONS: { before: string; label: JSXElement }[] = [
	{ before: '**', label: <b>B</b> },
	{ before: '_', label: <i>I</i> },
	{ before: '~~', label: <s>S</s> },
	{ before: '`', label: <span style={{ 'font-family': 'var(--font-mono)' }}>·`·</span> },
];

const COLOR_BUTTONS: { cssVar: string; className: string; title: string }[] = [
	{ cssVar: 'var(--aka)', className: 'c-aka', title: 'Aka' },
	{ cssVar: 'var(--muted-foreground)', className: 'c-muted', title: 'Muted' },
];

const SLASH_ITEMS: { insert: string; icon: string; name: string; hint: string }[] = [
	{ insert: '## ', icon: 'H2', name: 'Título 2', hint: '## subtítulo de sección' },
	{ insert: '### ', icon: 'H3', name: 'Título 3', hint: '### subtítulo menor' },
	{ insert: '> ', icon: '❝', name: 'Cita', hint: '> blockquote con borde aka' },
	{ insert: '- ', icon: '•', name: 'Lista', hint: '- ítems con viñeta' },
	{ insert: '```\n\n```', icon: '</>', name: 'Código', hint: 'bloque con lenguaje' },
	{ insert: '![descripción](https://)', icon: '📷', name: 'Imagen', hint: 'o arrastrala al editor' },
	{ insert: '\n---\n', name: 'Divisor', hint: 'línea horizontal', icon: '—' },
];

export default function EditorPane(props: Props) {
	let editorArea!: HTMLTextAreaElement;

	const [slashLineStart, setSlashLineStart] = createSignal(-1);
	const [slashTop, setSlashTop] = createSignal(96);
	const [dragActive, setDragActive] = createSignal(false);
	const [upload, setUpload] = createSignal<{ name: string; pct: number } | null>(null);
	const [uploadError, setUploadError] = createSignal('');

	const applyEdit = (result: EditResult) => {
		props.onEdit(result);
		// The signal update and the DOM value are the same text, so assigning
		// it directly here keeps the caret restore synchronous.
		editorArea.value = result.text;
		editorArea.setSelectionRange(result.caretStart, result.caretEnd);
		editorArea.focus();
	};

	const wrap = (before: string, after: string) => {
		applyEdit(wrapSelection(editorArea.value, editorArea.selectionStart, editorArea.selectionEnd, before, after));
	};

	const prefixLine = (prefix: string) => {
		applyEdit(insertLinePrefix(editorArea.value, editorArea.selectionStart, prefix));
	};

	const onEditorInput = () => {
		props.onType(editorArea.value);
		const target = slashTarget(editorArea.value, editorArea.selectionStart);

		if (target) {
			const line = editorArea.value.slice(0, editorArea.selectionStart).split('\n').length;
			setSlashTop(Math.min(line * 23 + 96, editorArea.clientHeight - 240));
			setSlashLineStart(target.lineStart);
		} else if (slashLineStart() >= 0) {
			setSlashLineStart(-1);
		}
	};

	const insertSlashItem = (snippet: string) => {
		const start = slashLineStart();
		if (start < 0) return;
		applyEdit(replaceRange(editorArea.value, start, start + 1, snippet));
		setSlashLineStart(-1);
	};

	const insertSnippetAtCaret = (snippet: string) => {
		applyEdit(replaceRange(editorArea.value, editorArea.selectionStart, editorArea.selectionStart, snippet));
	};

	/** Uploads one image and inserts its markdown once the delivery URL
	 * arrives; the toast shows the progress the XHR reports. */
	const beginUpload = (file: File) => {
		if (!file.type.startsWith('image/')) return;

		setUploadError('');
		setUpload({ name: file.name, pct: 0 });
		uploadBlogImage(file, (pct) => setUpload({ name: file.name, pct }))
			.then((result) => {
				const alt = file.name.replace(/\.[a-z0-9]+$/i, '') || 'imagen';
				insertSnippetAtCaret(`\n![${alt}](${result.url})\n`);
			})
			.catch((cause) => {
				setUploadError(cause instanceof Error && cause.message ? cause.message : 'No se pudo subir la imagen.');
			})
			.finally(() => {
				// Keep the failure visible through `uploadError`; clear the bar.
				if (uploadError()) setUpload(null);
				else {
					setTimeout(() => setUpload(null), 350);
				}
			});
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') setSlashLineStart(-1);
	};

	const onPaste = (event: ClipboardEvent) => {
		const items = event.clipboardData?.items;
		if (!items) return;
		const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
		if (!imageItem) return;

		event.preventDefault();
		const file = imageItem.getAsFile();
		if (file) void beginUpload(file);
	};

	return (
		<div
			class="pane left"
			onDragOver={(event) => {
				event.preventDefault();
				setDragActive(true);
			}}
			onDragLeave={() => setDragActive(false)}
			onDrop={(event) => {
				event.preventDefault();
				setDragActive(false);
				const file = event.dataTransfer?.files[0];
				if (file) void beginUpload(file);
			}}
		>
			<div class="drop-overlay" classList={{ show: dragActive() }}>
				📷 Soltá la imagen: se sube y se inserta sola
			</div>
			<Show when={upload() !== null}>
				<div class="upload-toast show" role="status">
					<span>Subiendo {upload()!.name}…</span>
					<span class="bar"><i style={{ width: `${upload()!.pct}%` }} /></span>
					<span>{upload()!.pct}%</span>
				</div>
			</Show>
			<Show when={uploadError()}>
				<div class="upload-toast show error-toast" role="alert">
					<span>{uploadError()}</span>
				</div>
			</Show>

			<div class="toolbar" role="toolbar" aria-label="Formato markdown">
				<For each={PREFIX_BUTTONS}>
					{(button) => (
						<button type="button" class="tb" onClick={() => prefixLine(button.prefix)}>
							{button.label}
						</button>
					)}
				</For>
				<span class="tb-sep" />
				<For each={WRAP_BUTTONS}>
					{(button) => (
						<button type="button" class="tb" onClick={() => wrap(button.before, button.before)}>
							{button.label}
						</button>
					)}
				</For>
				<button type="button" class="tb" onClick={() => wrap('[', '](https://)')}>
					🔗
				</button>
				<span class="tb-sep" />
				<span class="tb-label">Color</span>
				<For each={COLOR_BUTTONS}>
					{(color) => (
						<button
							type="button"
							class="swatch"
							style={{ background: color.cssVar }}
							title={color.title}
							aria-label={`Envolver con color ${color.title}`}
							onClick={() => wrap(`<span class="${color.className}">`, '</span>')}
						/>
					)}
				</For>
			</div>

			<textarea
				class="editor"
				ref={editorArea}
				value={props.content()}
				onInput={onEditorInput}
				onKeyDown={onKeyDown}
				onPaste={onPaste}
				spellcheck={false}
				aria-label="Contenido markdown"
			/>

			<div class="statusbar" role="status" aria-label="Métricas del editor">
				<span>{countWords(props.content())} palabras</span>
				<span>{countLines(props.content())} líneas</span>
				<span>~{readMinutes(props.content())} min de lectura</span>
			</div>

			<div class="slash-menu" classList={{ open: slashLineStart() >= 0 }} role="menu" aria-label="Insertar bloque" style={{ left: '24px', top: `${slashTop()}px` }}>
				<p class="slash-title">Insertar bloque</p>
				<For each={SLASH_ITEMS}>
					{(item) => (
						<button type="button" class="slash-item" role="menuitem" onClick={() => insertSlashItem(item.insert)}>
							<span class="ico">{item.icon}</span>
							<span>
								{item.name}
								<small>{item.hint}</small>
							</span>
						</button>
					)}
				</For>
			</div>
		</div>
	);
}
