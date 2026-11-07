import { createSignal, For, onMount, Show } from 'solid-js';
import {
	createRoadmapMilestone,
	createRoadmapStage,
	deleteRoadmapMilestone,
	deleteRoadmapStage,
	fetchAdminRoadmap,
	parseTechs,
	updateRoadmapMilestone,
	updateRoadmapStage,
} from './api/roadmap-admin';
import type {
	AdminRoadmapMilestoneRow,
	AdminRoadmapStageRow,
	RoadmapMilestoneStatus,
	RoadmapMilestoneWriteBody,
	RoadmapStageState,
	RoadmapStageWriteBody,
} from './api/roadmap-admin';

/**
 * Admin CRUD for the `roadmap` domain (`/admin/roadmap/`): the backend→web3
 * stages and milestones the public `/roadmap` page renders from the
 * `GET /roadmap` aggregate. One panel hosts both sub-lists (Etapas and
 * Hitos); every mutation reloads the aggregate, so the rows keep the API
 * order (`position`, ties by id). The session gate lives in the admin shell,
 * like the other panels.
 */

type Status = 'loading' | 'ready' | 'error';

/** The result of the last action, rendered as a strip above the editor. */
type Feedback =
	| { kind: 'idle' }
	| { kind: 'created'; target: 'stage' | 'milestone' }
	| { kind: 'saved' }
	| { kind: 'deleted'; target: 'stage' | 'milestone' }
	| { kind: 'error'; message: string };

/** Which sub-list a row belongs to; ids are numeric in both tables. */
type RowRef = { kind: 'stage' | 'milestone'; id: number };

/**
 * A typed position: a number sends it, `null` means "the admin left it blank"
 * (the backend decides the placement) and `invalid` is a non-integer the
 * panel refuses to guess about.
 */
type Position = number | null | 'invalid';

type StageFormState = {
	title: string;
	summary: string;
	/** Comma-separated text; split into the `string[]` the DTO expects. */
	techs: string;
	state: RoadmapStageState;
	/** Raw input text; parsed 0–100 before it travels. */
	progress: string;
	position: string;
};

type MilestoneFormState = {
	quarter: string;
	title: string;
	summary: string;
	status: RoadmapMilestoneStatus;
	position: string;
};

const EMPTY_STAGE_FORM: StageFormState = {
	title: '',
	summary: '',
	techs: '',
	state: 'next',
	progress: '0',
	position: '',
};

const EMPTY_MILESTONE_FORM: MilestoneFormState = {
	quarter: '',
	title: '',
	summary: '',
	status: 'planned',
	position: '',
};

const STAGE_STATE_LABELS: Record<RoadmapStageState, string> = {
	done: 'Completada',
	now: 'En curso',
	next: 'Próxima',
};

const MILESTONE_STATUS_LABELS: Record<RoadmapMilestoneStatus, string> = {
	now: 'Ahora',
	planned: 'Planificado',
};

const labelClass = 'block text-[11px] font-medium tracking-[0.2em] text-muted-foreground';
const inputClass =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-aka focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const hintClass = 'mt-1.5 text-[11px] leading-relaxed text-muted-foreground';
const cardClass = 'border border-border bg-card p-6';
const primaryButtonClass =
	'inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-aka hover:text-[#fdf8ee] disabled:cursor-not-allowed disabled:opacity-60';
const rowButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-aka hover:text-aka disabled:cursor-not-allowed disabled:opacity-60';
const dangerButtonClass =
	'inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60';

/** Reads the position input: blank stays blank, bad text is refused. */
function readPosition(value: string): Position {
	const trimmed = value.trim();

	if (!trimmed) return null;

	const parsed = Number(trimmed);

	return Number.isInteger(parsed) && parsed >= 0 ? parsed : 'invalid';
}

/** Reads the progress input against the DTO `@Min(0) @Max(100)` rule. */
function readProgress(value: string): number | 'invalid' {
	const trimmed = value.trim();
	const parsed = Number(trimmed);

	return trimmed && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 'invalid';
}

/** "Solidity, EVM" → `["Solidity","EVM"]`, dropping empty entries. */
function splitTechs(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function stageToForm(row: AdminRoadmapStageRow): StageFormState {
	return {
		title: row.title,
		summary: row.summary,
		techs: parseTechs(row.techs).join(', '),
		state: row.state,
		progress: String(row.progress),
		position: String(row.position),
	};
}

function stageToBody(form: StageFormState): RoadmapStageWriteBody {
	const position = readPosition(form.position);
	const body: RoadmapStageWriteBody = {
		title: form.title.trim(),
		summary: form.summary.trim(),
		techs: splitTechs(form.techs),
		state: form.state,
		progress: readProgress(form.progress) === 'invalid' ? 0 : (readProgress(form.progress) as number),
	};
	if (position !== null && position !== 'invalid') body.position = position;

	return body;
}

function milestoneToForm(row: AdminRoadmapMilestoneRow): MilestoneFormState {
	return {
		quarter: row.quarter,
		title: row.title,
		summary: row.summary,
		status: row.status,
		position: String(row.position),
	};
}

function milestoneToBody(form: MilestoneFormState): RoadmapMilestoneWriteBody {
	const position = readPosition(form.position);
	const body: RoadmapMilestoneWriteBody = {
		quarter: form.quarter.trim(),
		title: form.title.trim(),
		summary: form.summary.trim(),
		status: form.status,
	};
	if (position !== null && position !== 'invalid') body.position = position;

	return body;
}

/**
 * Client-side checks so the admin gets Spanish copy instead of a raw `400`;
 * the API still owns the authoritative answer.
 */
function validateStage(form: StageFormState): string | null {
	if (!form.title.trim()) return 'La etapa necesita un título.';
	if (!form.summary.trim()) return 'La etapa necesita un resumen.';
	if (readProgress(form.progress) === 'invalid') {
		return 'El progreso tiene que ser un número entero entre 0 y 100.';
	}
	if (readPosition(form.position) === 'invalid') {
		return 'La posición tiene que ser un número entero igual o mayor que cero.';
	}

	return null;
}

function validateMilestone(form: MilestoneFormState): string | null {
	if (!form.quarter.trim()) return 'El hito necesita un trimestre (por ejemplo, «Q3 · 2026»).';
	if (!form.title.trim()) return 'El hito necesita un título.';
	if (!form.summary.trim()) return 'El hito necesita un resumen.';
	if (readPosition(form.position) === 'invalid') {
		return 'La posición tiene que ser un número entero igual o mayor que cero.';
	}

	return null;
}

/**
 * Keeps the Spanish copy and appends the backend detail: a validation failure
 * answers `400 { message }` and hiding it would leave the admin without the
 * reason.
 */
function withDetail(fallback: string, cause: unknown): string {
	const detail = cause instanceof Error ? cause.message.trim() : '';

	return detail ? `${fallback} (${detail})` : fallback;
}

function sameRef(a: RowRef | null, b: RowRef): boolean {
	return a !== null && a.kind === b.kind && a.id === b.id;
}

type FieldProps = {
	id: string;
	label: string;
	value: string;
	placeholder?: string;
	hint?: string;
	type?: 'text' | 'number';
	multiline?: boolean;
	rows?: number;
	onInput: (value: string) => void;
};

/** One labelled input/textarea, shared by the create forms and the row editors. */
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
						min={props.type === 'number' ? 0 : undefined}
						max={props.type === 'number' ? 100 : undefined}
						step={props.type === 'number' ? 1 : undefined}
						value={props.value}
						placeholder={props.placeholder}
						onInput={(event) => props.onInput(event.currentTarget.value)}
						class={`${inputClass} mt-2`}
					/>
				}
			>
				<textarea
					id={props.id}
					rows={props.rows ?? 3}
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

type SelectProps<T extends string> = {
	id: string;
	label: string;
	value: T;
	options: { value: T; label: string }[];
	hint?: string;
	onChange: (value: T) => void;
};

/** One labelled `<select>`, used for the enum columns. */
function SelectField<T extends string>(props: SelectProps<T>) {
	return (
		<div>
			<label for={props.id} class={labelClass}>
				{props.label}
			</label>
			<select
				id={props.id}
				value={props.value}
				onChange={(event) => props.onChange(event.currentTarget.value as T)}
				class={`${inputClass} mt-2`}
			>
				<For each={props.options}>{(option) => <option value={option.value}>{option.label}</option>}</For>
			</select>
			{props.hint && <p class={hintClass}>{props.hint}</p>}
		</div>
	);
}

const STAGE_STATE_OPTIONS = (Object.keys(STAGE_STATE_LABELS) as RoadmapStageState[]).map((value) => ({
	value,
	label: STAGE_STATE_LABELS[value],
}));

const MILESTONE_STATUS_OPTIONS = (Object.keys(MILESTONE_STATUS_LABELS) as RoadmapMilestoneStatus[]).map((value) => ({
	value,
	label: MILESTONE_STATUS_LABELS[value],
}));

/** The fields of one stage, shared by the add form and the inline editor. */
function StageFields(props: {
	form: StageFormState;
	prefix: string;
	onInput: <K extends keyof StageFormState>(key: K, value: StageFormState[K]) => void;
}) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<Field
				id={`${props.prefix}-title`}
				label="TÍTULO"
				value={props.form.title}
				placeholder="Backend II"
				onInput={(value) => props.onInput('title', value)}
			/>
			<Field
				id={`${props.prefix}-techs`}
				label="TECNOLOGÍAS"
				value={props.form.techs}
				placeholder="NestJS, PostgreSQL, Docker"
				hint="Separadas por comas; se muestran como chips en el nodo."
				onInput={(value) => props.onInput('techs', value)}
			/>
			<div class="sm:col-span-2">
				<Field
					id={`${props.prefix}-summary`}
					label="RESUMEN"
					value={props.form.summary}
					multiline
					rows={3}
					onInput={(value) => props.onInput('summary', value)}
				/>
			</div>
			<SelectField
				id={`${props.prefix}-state`}
				label="ESTADO"
				value={props.form.state}
				options={STAGE_STATE_OPTIONS}
				onChange={(value) => props.onInput('state', value)}
			/>
			<Field
				id={`${props.prefix}-progress`}
				label="PROGRESO (0–100)"
				type="number"
				value={props.form.progress}
				hint="El anillo del nodo muestra este porcentaje; 0 en las etapas que todavía no empezaron."
				onInput={(value) => props.onInput('progress', value)}
			/>
			<Field
				id={`${props.prefix}-position`}
				label="POSICIÓN"
				type="number"
				value={props.form.position}
				placeholder="Al final"
				hint="La más chica va primero; si la dejas vacía, el backend decide el lugar."
				onInput={(value) => props.onInput('position', value)}
			/>
		</div>
	);
}

/** The fields of one milestone, shared by the add form and the inline editor. */
function MilestoneFields(props: {
	form: MilestoneFormState;
	prefix: string;
	onInput: <K extends keyof MilestoneFormState>(key: K, value: MilestoneFormState[K]) => void;
}) {
	return (
		<div class="grid gap-5 sm:grid-cols-2">
			<Field
				id={`${props.prefix}-quarter`}
				label="TRIMESTRE"
				value={props.form.quarter}
				placeholder="Q3 · 2026"
				onInput={(value) => props.onInput('quarter', value)}
			/>
			<Field
				id={`${props.prefix}-title`}
				label="TÍTULO"
				value={props.form.title}
				placeholder="Primer contrato inteligente auditado"
				onInput={(value) => props.onInput('title', value)}
			/>
			<div class="sm:col-span-2">
				<Field
					id={`${props.prefix}-summary`}
					label="RESUMEN"
					value={props.form.summary}
					multiline
					rows={3}
					onInput={(value) => props.onInput('summary', value)}
				/>
			</div>
			<SelectField
				id={`${props.prefix}-status`}
				label="ESTADO"
				value={props.form.status}
				options={MILESTONE_STATUS_OPTIONS}
				onChange={(value) => props.onInput('status', value)}
			/>
			<Field
				id={`${props.prefix}-position`}
				label="POSICIÓN"
				type="number"
				value={props.form.position}
				placeholder="Al final"
				hint="La más chica va primero; si la dejas vacía, el backend decide el lugar."
				onInput={(value) => props.onInput('position', value)}
			/>
		</div>
	);
}

export default function RoadmapEditorPanel() {
	const [status, setStatus] = createSignal<Status>('loading');
	const [stages, setStages] = createSignal<AdminRoadmapStageRow[]>([]);
	const [milestones, setMilestones] = createSignal<AdminRoadmapMilestoneRow[]>([]);
	const [pending, setPending] = createSignal(false);
	const [feedback, setFeedback] = createSignal<Feedback>({ kind: 'idle' });
	const [editing, setEditing] = createSignal<RowRef | null>(null);
	const [confirmingDelete, setConfirmingDelete] = createSignal<RowRef | null>(null);
	const [newStageForm, setNewStageForm] = createSignal<StageFormState>(EMPTY_STAGE_FORM);
	const [newMilestoneForm, setNewMilestoneForm] = createSignal<MilestoneFormState>(EMPTY_MILESTONE_FORM);
	const [stageDraft, setStageDraft] = createSignal<StageFormState>(EMPTY_STAGE_FORM);
	const [milestoneDraft, setMilestoneDraft] = createSignal<MilestoneFormState>(EMPTY_MILESTONE_FORM);

	async function load(options: { silent?: boolean } = {}) {
		if (!options.silent) setStatus('loading');

		try {
			const data = await fetchAdminRoadmap();
			setStages(data.stages ?? []);
			setMilestones(data.milestones ?? []);
			setStatus('ready');
		} catch {
			// The API message can be raw (for example `Unauthorized`); the panel
			// answers in Spanish and offers a retry, like the other panels.
			setStatus('error');
		}
	}

	onMount(() => {
		void load();
	});

	function updateNewStage<K extends keyof StageFormState>(key: K, value: StageFormState[K]) {
		setNewStageForm((current) => ({ ...current, [key]: value }));
	}

	function updateStageDraft<K extends keyof StageFormState>(key: K, value: StageFormState[K]) {
		setStageDraft((current) => ({ ...current, [key]: value }));
	}

	function updateNewMilestone<K extends keyof MilestoneFormState>(key: K, value: MilestoneFormState[K]) {
		setNewMilestoneForm((current) => ({ ...current, [key]: value }));
	}

	function updateMilestoneDraft<K extends keyof MilestoneFormState>(key: K, value: MilestoneFormState[K]) {
		setMilestoneDraft((current) => ({ ...current, [key]: value }));
	}

	/** Reloads the stored aggregate after the mutation; `true` when it reached the API. */
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

	async function handleCreateStage(event: SubmitEvent) {
		event.preventDefault();

		const current = newStageForm();
		const problem = validateStage(current);
		if (problem) {
			setFeedback({ kind: 'error', message: problem });
			return;
		}

		const created = await mutate(() => createRoadmapStage(stageToBody(current)), {
			kind: 'created',
			target: 'stage',
		});

		if (created) setNewStageForm(EMPTY_STAGE_FORM);
	}

	async function handleCreateMilestone(event: SubmitEvent) {
		event.preventDefault();

		const current = newMilestoneForm();
		const problem = validateMilestone(current);
		if (problem) {
			setFeedback({ kind: 'error', message: problem });
			return;
		}

		const created = await mutate(() => createRoadmapMilestone(milestoneToBody(current)), {
			kind: 'created',
			target: 'milestone',
		});

		if (created) setNewMilestoneForm(EMPTY_MILESTONE_FORM);
	}

	function startEditStage(row: AdminRoadmapStageRow) {
		setEditing({ kind: 'stage', id: row.id });
		setConfirmingDelete(null);
		setStageDraft(stageToForm(row));
		setFeedback({ kind: 'idle' });
	}

	function startEditMilestone(row: AdminRoadmapMilestoneRow) {
		setEditing({ kind: 'milestone', id: row.id });
		setConfirmingDelete(null);
		setMilestoneDraft(milestoneToForm(row));
		setFeedback({ kind: 'idle' });
	}

	function cancelEdit() {
		setEditing(null);
		setFeedback({ kind: 'idle' });
	}

	async function handleEditStage(event: SubmitEvent, id: number) {
		event.preventDefault();

		const current = stageDraft();
		const problem = validateStage(current);
		if (problem) {
			setFeedback({ kind: 'error', message: problem });
			return;
		}

		const saved = await mutate(() => updateRoadmapStage(id, stageToBody(current)), { kind: 'saved' });

		if (saved) setEditing(null);
	}

	async function handleEditMilestone(event: SubmitEvent, id: number) {
		event.preventDefault();

		const current = milestoneDraft();
		const problem = validateMilestone(current);
		if (problem) {
			setFeedback({ kind: 'error', message: problem });
			return;
		}

		const saved = await mutate(() => updateRoadmapMilestone(id, milestoneToBody(current)), { kind: 'saved' });

		if (saved) setEditing(null);
	}

	async function handleDelete(ref: RowRef) {
		const removed = await mutate(
			() => (ref.kind === 'stage' ? deleteRoadmapStage(ref.id) : deleteRoadmapMilestone(ref.id)),
			{ kind: 'deleted', target: ref.kind },
		);

		if (!removed) return;

		setConfirmingDelete(null);
		if (sameRef(editing(), ref)) setEditing(null);
	}

	function successText(): string | null {
		const current = feedback();

		switch (current.kind) {
			case 'created':
				return current.target === 'stage' ? 'Etapa añadida. La web ya muestra el cambio.' : 'Hito añadido. La web ya muestra el cambio.';
			case 'saved':
				return 'Cambios guardados.';
			case 'deleted':
				return current.target === 'stage' ? 'Etapa eliminada.' : 'Hito eliminado.';
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
					Cargando la hoja de ruta…
				</p>
			</Show>

			<Show when={status() === 'error'}>
				<div role="alert" class="flex flex-col gap-4 border border-destructive/40 bg-destructive/10 p-6">
					<p class="text-sm text-foreground">
						No pudimos cargar la hoja de ruta. Inténtalo de nuevo en unos minutos.
					</p>
					<button type="button" onClick={() => void load()} class={`${rowButtonClass} h-10 px-5 text-sm`}>
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

				<section aria-labelledby="roadmap-etapa-nueva" class={cardClass}>
					<h2 id="roadmap-etapa-nueva" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
						NUEVA ETAPA
					</h2>
					<form onSubmit={handleCreateStage} class="mt-5 grid gap-5">
						<StageFields form={newStageForm()} prefix="stage-new" onInput={updateNewStage} />
						<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
							<button type="submit" disabled={pending()} class={primaryButtonClass}>
								{pending() ? 'Guardando…' : 'Añadir etapa'}
							</button>
						</div>
					</form>
				</section>

				<section aria-labelledby="roadmap-etapas" class="flex flex-col gap-4">
					<div class="flex items-baseline justify-between gap-4">
						<h2 id="roadmap-etapas" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							ETAPAS GUARDADAS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{stages().length} {stages().length === 1 ? 'etapa' : 'etapas'} · en orden de posición
						</p>
					</div>

					<Show
						when={stages().length > 0}
						fallback={
							<p class="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
								Todavía no hay etapas guardadas: el grafo de la página pública queda vacío. Añade la primera en el
								formulario de arriba.
							</p>
						}
					>
						<ul class="flex flex-col gap-3">
							<For each={stages()}>
								{(row) => (
									<li class={cardClass}>
										<Show
											when={sameRef(editing(), { kind: 'stage', id: row.id })}
											fallback={
												<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
													<div class="min-w-0">
														<p class="truncate font-medium">{row.title}</p>
														<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
															{row.summary || 'Sin resumen.'}
														</p>
														<p class="mt-1.5 font-mono text-[12px] text-muted-foreground">
															#{row.position} · {STAGE_STATE_LABELS[row.state] ?? row.state} · {row.progress}% ·{' '}
															{parseTechs(row.techs).join(', ') || 'Sin tecnologías'}
														</p>
													</div>
													<div class="flex shrink-0 flex-wrap items-center gap-2">
														<Show
															when={sameRef(confirmingDelete(), { kind: 'stage', id: row.id })}
															fallback={
																<>
																	<button type="button" onClick={() => startEditStage(row)} class={rowButtonClass}>
																		Editar
																	</button>
																	<button
																		type="button"
																		onClick={() => setConfirmingDelete({ kind: 'stage', id: row.id })}
																		class={dangerButtonClass}
																	>
																		Eliminar
																	</button>
																</>
															}
														>
															<span class="text-[12px] text-muted-foreground">¿Eliminar la etapa «{row.title}»?</span>
															<button
																type="button"
																disabled={pending()}
																onClick={() => void handleDelete({ kind: 'stage', id: row.id })}
																class={dangerButtonClass}
															>
																Sí, eliminar
															</button>
															<button
																type="button"
																onClick={() => setConfirmingDelete(null)}
																class={rowButtonClass}
															>
																Cancelar
															</button>
														</Show>
													</div>
												</div>
											}
										>
											<form onSubmit={(event) => void handleEditStage(event, row.id)} class="grid gap-5">
												<StageFields
													form={stageDraft()}
													prefix={`stage-edit-${row.id}`}
													onInput={updateStageDraft}
												/>
												<div class="flex flex-wrap items-center gap-2">
													<button type="submit" disabled={pending()} class={primaryButtonClass}>
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

				<section aria-labelledby="roadmap-hito-nuevo" class={cardClass}>
					<h2 id="roadmap-hito-nuevo" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
						NUEVO HITO
					</h2>
					<form onSubmit={handleCreateMilestone} class="mt-5 grid gap-5">
						<MilestoneFields form={newMilestoneForm()} prefix="milestone-new" onInput={updateNewMilestone} />
						<div class="flex flex-wrap items-center gap-4 border-t border-border pt-5">
							<button type="submit" disabled={pending()} class={primaryButtonClass}>
								{pending() ? 'Guardando…' : 'Añadir hito'}
							</button>
						</div>
					</form>
				</section>

				<section aria-labelledby="roadmap-hitos" class="flex flex-col gap-4">
					<div class="flex items-baseline justify-between gap-4">
						<h2 id="roadmap-hitos" class="text-[11px] font-medium tracking-[0.25em] text-muted-foreground">
							HITOS GUARDADOS
						</h2>
						<p class="font-mono text-[11px] text-muted-foreground">
							{milestones().length} {milestones().length === 1 ? 'hito' : 'hitos'} · en orden de posición
						</p>
					</div>

					<Show
						when={milestones().length > 0}
						fallback={
							<p class="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
								Todavía no hay hitos guardados: la lista «Próximos hitos» de la página pública queda vacía. Añade el
								primero en el formulario de arriba.
							</p>
						}
					>
						<ul class="flex flex-col gap-3">
							<For each={milestones()}>
								{(row) => (
									<li class={cardClass}>
										<Show
											when={sameRef(editing(), { kind: 'milestone', id: row.id })}
											fallback={
												<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
													<div class="min-w-0">
														<p class="truncate font-medium">{row.title}</p>
														<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
															{row.summary || 'Sin resumen.'}
														</p>
														<p class="mt-1.5 font-mono text-[12px] text-muted-foreground">
															#{row.position} · {row.quarter} · {MILESTONE_STATUS_LABELS[row.status] ?? row.status}
														</p>
													</div>
													<div class="flex shrink-0 flex-wrap items-center gap-2">
														<Show
															when={sameRef(confirmingDelete(), { kind: 'milestone', id: row.id })}
															fallback={
																<>
																	<button
																		type="button"
																		onClick={() => startEditMilestone(row)}
																		class={rowButtonClass}
																	>
																		Editar
																	</button>
																	<button
																		type="button"
																		onClick={() => setConfirmingDelete({ kind: 'milestone', id: row.id })}
																		class={dangerButtonClass}
																	>
																		Eliminar
																	</button>
																</>
															}
														>
															<span class="text-[12px] text-muted-foreground">¿Eliminar el hito «{row.title}»?</span>
															<button
																type="button"
																disabled={pending()}
																onClick={() => void handleDelete({ kind: 'milestone', id: row.id })}
																class={dangerButtonClass}
															>
																Sí, eliminar
															</button>
															<button
																type="button"
																onClick={() => setConfirmingDelete(null)}
																class={rowButtonClass}
															>
																Cancelar
															</button>
														</Show>
													</div>
												</div>
											}
										>
											<form onSubmit={(event) => void handleEditMilestone(event, row.id)} class="grid gap-5">
												<MilestoneFields
													form={milestoneDraft()}
													prefix={`milestone-edit-${row.id}`}
													onInput={updateMilestoneDraft}
												/>
												<div class="flex flex-wrap items-center gap-2">
													<button type="submit" disabled={pending()} class={primaryButtonClass}>
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
