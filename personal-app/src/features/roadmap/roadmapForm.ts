import { parseNonNegativeInt } from '../../shared/lib/adminPanel';
import { parseTechs } from './api/roadmap-admin';
import type {
	AdminRoadmapMilestoneRow,
	AdminRoadmapStageRow,
	RoadmapMilestoneStatus,
	RoadmapMilestoneWriteBody,
	RoadmapStageState,
	RoadmapStageWriteBody,
} from './api/roadmap-admin';

/**
 * Pure form helpers for the roadmap admin panel: the editable shape of the two
 * sub-lists it hosts (stages and milestones), their empty defaults, the
 * state/status catalogues, the stored row ↔ form and form ↔ body mappers
 * (including the `techs` JSON list conversion and the 0–100 progress clamp),
 * the label helpers and the Spanish client-side validation. No DOM here, and
 * no requests: the panel owns the signals, this module owns the mapping.
 */

// ── Etapas ────────────────────────────────────────────────────────────────────

/**
 * The editable stage. `techs` is the comma-separated text the input shows,
 * `progress` and `position` stay literal so a half-typed number survives.
 */
export type StageFormState = {
	title: string;
	summary: string;
	/** Comma-separated text; split into the `string[]` the DTO expects. */
	techs: string;
	state: RoadmapStageState;
	/** Raw input text; parsed 0–100 before it travels. */
	progress: string;
	position: string;
};

export const EMPTY_STAGE_FORM: StageFormState = {
	title: '',
	summary: '',
	techs: '',
	state: 'next',
	progress: '0',
	position: '',
};

export const ROADMAP_STAGE_STATE_OPTIONS: { value: RoadmapStageState; label: string }[] = [
	{ value: 'done', label: 'Completada' },
	{ value: 'now', label: 'En curso' },
	{ value: 'next', label: 'Próxima' },
];

/** Rendered label of a stored stage state; raw keys show as they come. */
export function roadmapStageStateLabel(state: string): string {
	return ROADMAP_STAGE_STATE_OPTIONS.find((option) => option.value === state)?.label ?? state;
}

/** Reads the progress input against the DTO `@Min(0) @Max(100)` rule. */
export function readProgress(value: string): number | 'invalid' {
	const trimmed = value.trim();
	const parsed = Number(trimmed);

	return trimmed && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 'invalid';
}

/** Reads the position input: blank stays blank, bad text is refused. */
export function readPosition(value: string): number | null | 'invalid' {
	return parseNonNegativeInt(value);
}

/** "Solidity, EVM" → `["Solidity","EVM"]`, dropping empty entries. */
export function splitTechs(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

/** Stored stage → editable form, normalising the `techs` JSON column on the way. */
export function stageToForm(row: AdminRoadmapStageRow): StageFormState {
	return {
		title: row.title,
		summary: row.summary,
		techs: parseTechs(row.techs).join(', '),
		state: row.state,
		progress: String(row.progress),
		position: String(row.position),
	};
}

/**
 * Form → API body. `position` only travels when the admin typed a whole
 * number: a blank field leaves the placement to the backend, and an unreadable
 * one travels as nothing instead of being guessed. An unreadable progress
 * clamps to `0`, the value the ring shows for a stage that has not started.
 */
export function stageFormToBody(form: StageFormState): RoadmapStageWriteBody {
	const position = readPosition(form.position);
	const progress = readProgress(form.progress);
	const body: RoadmapStageWriteBody = {
		title: form.title.trim(),
		summary: form.summary.trim(),
		techs: splitTechs(form.techs),
		state: form.state,
		progress: progress === 'invalid' ? 0 : progress,
	};
	if (position !== null && position !== 'invalid') body.position = position;

	return body;
}

/** Client-side check so the admin gets Spanish copy instead of a raw `400`. */
export function validateStageForm(form: StageFormState): string | null {
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

// ── Hitos ─────────────────────────────────────────────────────────────────────

/** The editable milestone of the "Próximos hitos" list. */
export type MilestoneFormState = {
	quarter: string;
	title: string;
	summary: string;
	status: RoadmapMilestoneStatus;
	position: string;
};

export const EMPTY_MILESTONE_FORM: MilestoneFormState = {
	quarter: '',
	title: '',
	summary: '',
	status: 'planned',
	position: '',
};

export const ROADMAP_MILESTONE_STATUS_OPTIONS: { value: RoadmapMilestoneStatus; label: string }[] = [
	{ value: 'now', label: 'Ahora' },
	{ value: 'planned', label: 'Planificado' },
];

/** Rendered label of a stored milestone status; raw keys show as they come. */
export function roadmapMilestoneStatusLabel(status: string): string {
	return ROADMAP_MILESTONE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

/** Stored milestone → editable form. */
export function milestoneToForm(row: AdminRoadmapMilestoneRow): MilestoneFormState {
	return {
		quarter: row.quarter,
		title: row.title,
		summary: row.summary,
		status: row.status,
		position: String(row.position),
	};
}

/** Form → API body, with the same optional `position` rule as the stages. */
export function milestoneFormToBody(form: MilestoneFormState): RoadmapMilestoneWriteBody {
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

/** Client-side check so the admin gets Spanish copy instead of a raw `400`. */
export function validateMilestoneForm(form: MilestoneFormState): string | null {
	if (!form.quarter.trim()) return 'El hito necesita un trimestre (por ejemplo, «Q3 · 2026»).';
	if (!form.title.trim()) return 'El hito necesita un título.';
	if (!form.summary.trim()) return 'El hito necesita un resumen.';
	if (readPosition(form.position) === 'invalid') {
		return 'La posición tiene que ser un número entero igual o mayor que cero.';
	}

	return null;
}
