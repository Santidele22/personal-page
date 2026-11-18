import { For, Show } from 'solid-js';
import { BASIC_TECHNOLOGIES } from '../../../entities/project/technologies';
import { adminHintClass, adminLabelClass } from '../../../shared/ui/admin/styles';
import {
	PROJECT_ICON_OPTIONS,
	PROJECT_STATUS_OPTIONS,
	PROJECT_TYPE_OPTIONS,
	extraTechnologies,
} from '../projectForm';
import type { ProjectFormState } from '../projectForm';

/**
 * Shared field controls and atoms of the projects panel: the labelled input,
 * select, and technology toggle list, the field grid both forms render, the
 * notice line every mutation answers with, and the button/badge tokens of this
 * panel. The panel owns the draft and the Spanish validation; this module only
 * renders and reports input.
 *
 * The tokens are local because this panel ships its own sizes: its primary
 * button is `h-11 px-6` (the shared one is `h-10 px-5`), its secondary button
 * keeps the inherited text colour, and its inputs never lock, so they carry no
 * disabled variant.
 */

/** Field input styling of the project forms. */
export const projectInputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Primary submit button of the project forms. */
export const projectPrimaryButtonClass =
	'inline-flex h-11 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';

/** Secondary action button: start edit, cancel, or dismiss a delete. */
export const projectSecondaryButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';

/** Destructive action button: the two-step delete of a row. */
export const projectDangerButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60';

/** Small read-only chip of a stored column in the row summary. */
export const projectBadgeClass =
	'inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground';

/** Chip of the technology toggle list; `aria-pressed` carries the active state. */
export const projectChipButtonClass =
	'inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-aka/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[pressed=true]:border-foreground aria-[pressed=true]:bg-foreground aria-[pressed=true]:text-background aria-[pressed=true]:hover:border-foreground';

type ProjectFieldProps = {
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
function ProjectField(props: ProjectFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
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
						class={`${projectInputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 4}
					value={props.value}
					placeholder={props.placeholder}
					onInput={(event) => props.onInput(event.currentTarget.value)}
					class={`${projectInputClass} mt-2 resize-y leading-relaxed`}
				/>
			</Show>
			{props.hint && <p class={adminHintClass}>{props.hint}</p>}
		</div>
	);
}

type ProjectSelectFieldProps = {
	id: string;
	label: string;
	value: string;
	emptyLabel: string;
	options: { value: string; label: string }[];
	hint?: string;
	onInput: (value: string) => void;
};

/** One labelled select; the empty option clears the stored column. */
function ProjectSelectField(props: ProjectSelectFieldProps) {
	return (
		<div>
			<label for={props.id} class={adminLabelClass}>
				{props.label}
			</label>
			<select
				id={props.id}
				onChange={(event) => props.onInput(event.currentTarget.value)}
				class={`${projectInputClass} mt-2`}
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
			{props.hint && <p class={adminHintClass}>{props.hint}</p>}
		</div>
	);
}

type ProjectTechnologyTogglesProps = {
	id: string;
	value: string[];
	onInput: (value: string[]) => void;
};

/**
 * Toggle list of the technology catalog: every chip switches one id in or out
 * of the selection, and the ids stored outside the catalog keep their own
 * dashed toggle (raw id as label) so an old free-text row saves back intact.
 * `aria-pressed` carries the active state and its styling keys on it.
 */
function ProjectTechnologyToggles(props: ProjectTechnologyTogglesProps) {
	const extras = () => extraTechnologies(props.value);

	function toggle(id: string) {
		props.onInput(
			props.value.includes(id) ? props.value.filter((value) => value !== id) : [...props.value, id],
		);
	}

	return (
		<div>
			<span id={props.id} class={adminLabelClass}>
				TECNOLOGÍAS
			</span>
			<div role="group" aria-labelledby={props.id} class="mt-2 flex flex-wrap gap-2">
				<For each={BASIC_TECHNOLOGIES}>
					{(technology) => (
						<button
							type="button"
							aria-pressed={props.value.includes(technology.id)}
							onClick={() => toggle(technology.id)}
							class={projectChipButtonClass}
						>
							{technology.label}
						</button>
					)}
				</For>
				<For each={extras()}>
					{(id) => (
						<button
							type="button"
							aria-pressed="true"
							onClick={() => toggle(id)}
							class={`${projectChipButtonClass} border-dashed`}
						>
							{id}
						</button>
					)}
				</For>
			</div>
			<p class={adminHintClass}>Elige las tecnologías usadas en el proyecto.</p>
			<Show when={extras().length > 0}>
				<p class={adminHintClass}>
					Las etiquetas punteadas vienen guardadas de antes y no están en el catálogo; se quitan al
					desmarcarlas.
				</p>
			</Show>
		</div>
	);
}

export type ProjectFieldsProps = {
	form: ProjectFormState;
	/** Id prefix so the add form and the row editors never share labels. */
	prefix: string;
	onInput: <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) => void;
};

/** The fields of one project, shared by the add form and the inline editor. */
export function ProjectFields(props: ProjectFieldsProps) {
	return (
		<>
			<div class="grid gap-5 sm:grid-cols-2">
				<ProjectField
					id={`${props.prefix}-name`}
					label="NOMBRE"
					value={props.form.name}
					onInput={(value) => props.onInput('name', value)}
				/>
				<ProjectField
					id={`${props.prefix}-url`}
					label="ENLACE"
					value={props.form.url}
					placeholder="https://…"
					hint="La dirección pública del proyecto."
					onInput={(value) => props.onInput('url', value)}
				/>
			</div>
			<ProjectField
				id={`${props.prefix}-description`}
				label="DESCRIPCIÓN"
				value={props.form.description}
				multiline
				rows={3}
				onInput={(value) => props.onInput('description', value)}
			/>
			<ProjectTechnologyToggles
				id={`${props.prefix}-technologies`}
				value={props.form.technologies}
				onInput={(value) => props.onInput('technologies', value)}
			/>
			<div class="grid gap-5 sm:grid-cols-2">
				<ProjectField
					id={`${props.prefix}-github`}
					label="REPOSITORIO (GITHUB)"
					value={props.form.githubUrl}
					placeholder="https://github.com/…"
					hint="Opcional: si falta, la tarjeta enlaza al proyecto."
					onInput={(value) => props.onInput('githubUrl', value)}
				/>
				<ProjectField
					id={`${props.prefix}-tagline`}
					label="FRASE"
					value={props.form.tagline}
					placeholder="Una línea que lo resume"
					hint="Opcional: se pinta debajo del nombre."
					onInput={(value) => props.onInput('tagline', value)}
				/>
			</div>
			<div class="grid gap-5 sm:grid-cols-2">
				<ProjectSelectField
					id={`${props.prefix}-icon`}
					label="ICONO"
					value={props.form.icon}
					emptyLabel="Sin icono (la web elige uno)"
					options={PROJECT_ICON_OPTIONS}
					onInput={(value) => props.onInput('icon', value)}
				/>
				<ProjectSelectField
					id={`${props.prefix}-status`}
					label="ESTADO"
					value={props.form.status}
					emptyLabel="Sin estado"
					options={PROJECT_STATUS_OPTIONS}
					onInput={(value) => props.onInput('status', value)}
				/>
				<ProjectSelectField
					id={`${props.prefix}-type`}
					label="TIPO"
					value={props.form.type}
					emptyLabel="Sin tipo"
					options={PROJECT_TYPE_OPTIONS}
					onInput={(value) => props.onInput('type', value)}
				/>
			</div>
			<div class="grid gap-5 sm:grid-cols-2">
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
					<p class={adminHintClass}>La tarjeta grande de la grilla; solo una debería estar marcada.</p>
				</div>
				<div>
					<label class="flex w-fit items-center gap-3">
						<input
							type="checkbox"
							checked={props.form.forSale}
							onChange={(event) => props.onInput('forSale', event.currentTarget.checked)}
							class="size-4 rounded-sm border border-border bg-background accent-aka"
						/>
						<span class="text-[11px] font-medium tracking-[0.2em] text-muted-foreground">A LA VENTA</span>
					</label>
					<p class={adminHintClass}>Muestra Comprar y abre el contacto por email.</p>
				</div>
			</div>
		</>
	);
}

/** Mutation feedback of one scope. `detail` carries the API message when there is one. */
export type ProjectNotice = {
	scope: 'create' | 'edit' | 'delete';
	kind: 'saved' | 'error';
	message: string;
	detail?: string;
};

/** Saved/error line of one mutation, in Spanish with the API detail. */
export function ProjectFeedback(props: { notice: ProjectNotice | null }) {
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
