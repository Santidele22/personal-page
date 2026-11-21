import { BASIC_TECHNOLOGIES } from '../../entities/project/technologies';
import type { ProjectIcon, ProjectStatus } from '../../entities/project/types';
import type { AdminProjectRow, ProjectWriteBody } from './api/projects-admin';

/**
 * Pure form helpers for the projects admin panel: the editable shape, the
 * stored row ↔ form mappers, the icon/status/category catalogues, the label and
 * counter helpers, the technology list conversion and the Spanish client-side
 * validation. No DOM and no requests here.
 */

export type ProjectFormState = {
	url: string;
	name: string;
	description: string;
	/** Stored technology ids selected in the toggle list; the API stores the list. */
	technologies: string[];
	githubUrl: string;
	/** Icon key, empty when the card ships without one. */
	icon: string;
	tagline: string;
	/** Status key, empty when the card has no state. */
	status: string;
	/** Portfolio category key, empty when the card has none. */
	type: string;
	featured: boolean;
	forSale: boolean;
};

export const EMPTY_PROJECT_FORM: ProjectFormState = {
	url: '',
	name: '',
	description: '',
	technologies: [],
	githubUrl: '',
	icon: '',
	tagline: '',
	status: '',
	type: '',
	featured: false,
	forSale: false,
};

export const PROJECT_ICON_OPTIONS: { value: ProjectIcon; label: string }[] = [
	{ value: 'sprout', label: 'Brote' },
	{ value: 'feather', label: 'Pluma' },
	{ value: 'blocks', label: 'Bloques' },
	{ value: 'wrench', label: 'Llave' },
];

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
	{ value: 'en-produccion', label: 'En producción' },
	{ value: 'en-construccion', label: 'En construcción' },
	{ value: 'codigo-abierto', label: 'Código abierto' },
];

/** Portfolio categories the backend stores as free text (issue: projects type). */
export const PROJECT_TYPE_OPTIONS: { value: string; label: string }[] = [
	{ value: 'full-stack', label: 'Full-stack' },
	{ value: 'backend', label: 'Backend' },
	{ value: 'frontend', label: 'Frontend' },
	{ value: 'auditoria', label: 'Auditoría' },
	{ value: 'web3', label: 'Web3' },
	{ value: 'sistemas', label: 'Sistemas / Linux' },
	{ value: 'juegos', label: 'Juegos' },
];

/** The values the API accepts in `icon`; anything else travels as `null`. */
const ICON_KEYS: string[] = PROJECT_ICON_OPTIONS.map((option) => option.value);
/** The values the API accepts in `status`; anything else travels as `null`. */
const STATUS_KEYS: string[] = PROJECT_STATUS_OPTIONS.map((option) => option.value);

/** Rendered label of a stored status key; raw keys show as they come. */
export function projectStatusLabel(status: string): string {
	return PROJECT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

/** Stored row → editable form, the same mapping the profile editor uses. */
export function projectToForm(row: AdminProjectRow): ProjectFormState {
	return {
		url: row.url,
		name: row.name,
		description: row.description,
		technologies: [...row.technologies],
		githubUrl: row.githubUrl ?? '',
		icon: row.icon ?? '',
		tagline: row.tagline ?? '',
		status: row.status ?? '',
		type: row.type ?? '',
		featured: row.featured === true,
		forSale: row.forSale === true,
	};
}

/**
 * Selected ids → API list. Trims each id, drops the blanks a stored row may
 * carry and collapses duplicates without reordering the selection.
 */
export function cleanTechnologies(ids: string[]): string[] {
	return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

/** Selected ids the catalog does not know: stored free text shown as extra toggles. */
export function extraTechnologies(selected: string[]): string[] {
	const catalogIds = BASIC_TECHNOLOGIES.map((technology) => technology.id);
	return selected.filter((id) => id.trim() !== '' && !catalogIds.includes(id));
}

/**
 * Form → API body. `null` (not `''`) for the empty optional columns: the DTO
 * accepts `null` and clears the stored value, while `''` would fail `@IsUrl()`
 * on `githubUrl` and `@IsNotEmpty()` on the rest.
 */
export function projectFormToBody(form: ProjectFormState): ProjectWriteBody {
	return {
		url: form.url.trim(),
		name: form.name.trim(),
		description: form.description.trim(),
		technologies: cleanTechnologies(form.technologies),
		githubUrl: form.githubUrl.trim() || null,
		icon: ICON_KEYS.includes(form.icon) ? (form.icon as ProjectIcon) : null,
		tagline: form.tagline.trim() || null,
		status: STATUS_KEYS.includes(form.status) ? (form.status as ProjectStatus) : null,
		type: form.type.trim() || null,
		featured: form.featured,
		forSale: form.forSale,
	};
}

/** Client-side check so the admin gets Spanish copy instead of a raw `400`. */
export function validateProjectForm(form: ProjectFormState): string | null {
	if (!form.url.trim()) return 'El proyecto necesita un enlace.';
	if (!form.name.trim()) return 'El proyecto necesita un nombre.';
	if (!form.description.trim()) return 'El proyecto necesita una descripción.';

	const github = form.githubUrl.trim();
	if (github && !/^https?:\/\//i.test(github)) {
		return 'El repositorio tiene que ser una URL completa, con https:// delante.';
	}

	return null;
}

/** Counter word of the list header. */
export function projectCountLabel(count: number): string {
	return count === 1 ? 'proyecto' : 'proyectos';
}
