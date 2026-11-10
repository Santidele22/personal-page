import type { Project, ProjectIcon, ProjectStatus, ProjectType } from '../../../entities/project/types';
import { projects } from '../../../entities/project/data';
import { getJson } from '../../../shared/api/http';
import { pageQuery, type Paged } from '../../../shared/api/pagination';
import { safeHref } from '../../../shared/api/url';

const PROJECT_ICONS: ProjectIcon[] = ['sprout', 'feather', 'blocks', 'wrench'];
const PROJECT_STATUSES: ProjectStatus[] = ['en-produccion', 'en-construccion', 'codigo-abierto'];
const PROJECT_TYPES: ProjectType[] = ['full-stack', 'backend', 'frontend', 'auditoria', 'web3'];

/** Rendered label of each stored status key. */
const STATUS_LABELS: Record<ProjectStatus, string> = {
	'en-produccion': 'En producción',
	'en-construccion': 'En construcción',
	'codigo-abierto': 'Código abierto',
};

/** Rendered label of each stored type key. */
const TYPE_LABELS: Record<ProjectType, string> = {
	'full-stack': 'Full-stack',
	backend: 'Backend',
	frontend: 'Frontend',
	auditoria: 'Auditoría',
	web3: 'Web3',
};

/**
 * Category of a stored row: the known key keeps its enum value and label,
 * an unknown stored key stays as free text with a capitalized label so the
 * chip still reads like a category, and a missing one renders no chip.
 */
function mapType(raw?: string | null): { type: ProjectType | string | null; typeLabel: string | null } {
	if (!raw) return { type: null, typeLabel: null };
	if (PROJECT_TYPES.includes(raw as ProjectType)) {
		return { type: raw, typeLabel: TYPE_LABELS[raw as ProjectType] };
	}
	return { type: raw, typeLabel: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

/**
 * A project row as `GET /projects` serves it: the editable body plus the
 * optional portada card columns the landing renders (`icon`, `tagline`,
 * `status`, `featured`).
 */
type ApiProjectCard = {
	id: number;
	url: string;
	name: string;
	description: string;
	githubUrl?: string | null;
	technologies: string[];
	icon?: string | null;
	tagline?: string | null;
	status?: string | null;
	type?: string | null;
	featured?: boolean | null;
	forSale?: boolean | null;
};

/**
 * The projects cards (`widgets/projects/Projects.astro`). `null` only means
 * the request itself failed (API down, proxy misconfigured, server without the
 * backend): the widget then renders the values the block shipped with exactly
 * like the profile loader. Empty storage answers `[]`: the backend is the
 * only source of truth, so the section renders without cards until the admin
 * publishes one.
 */
function mapProjectCard(project: ApiProjectCard): Project {
	const status = PROJECT_STATUSES.includes(project.status as ProjectStatus)
		? (project.status as ProjectStatus)
		: 'en-construccion';

	// Esquemas http/https/mailto únicamente (issue 38): una URL
	// administrable con otro esquema queda vacía y la tarjeta omite
	// ese enlace en vez de renderizarlo.
	const repo = safeHref(project.githubUrl ?? project.url) ?? '';
	// A demo row that holed at the repo URL is not a demo; the card then
	// renders only the repository link instead of a lying Demo anchor.
	const demo = project.url === project.githubUrl ? undefined : project.url;

	const { type, typeLabel } = mapType(project.type);

	return {
		name: project.name,
		icon: PROJECT_ICONS.includes(project.icon as ProjectIcon)
			? (project.icon as ProjectIcon)
			: 'wrench',
		tagline: project.tagline ?? '',
		description: project.description,
		stack: project.technologies,
		status,
		statusLabel: STATUS_LABELS[status],
		type,
		typeLabel,
		repoUrl: repo,
		demoUrl: safeHref(demo),
		featured: project.featured === true,
		forSale: project.forSale === true,
	};
}

export async function fetchProjects(serverOrigin?: string): Promise<Project[] | null> {
	try {
		const rows = await getJson<ApiProjectCard[]>('/projects', { serverOrigin });

		return rows.map(mapProjectCard);
	} catch {
		return null;
	}
}

/** Paginated read of the same cards (issue 47 S3/S8): envelope + `total` for the landing cap and «Ver todos». */
export async function fetchProjectsPage(
	serverOrigin: string | undefined,
	offset: number | undefined,
	limit: number,
): Promise<Paged<Project> | null> {
	try {
		const page = await getJson<Paged<ApiProjectCard>>(`/projects${pageQuery(offset, limit)}`, { serverOrigin });
		return { ...page, items: page.items.map(mapProjectCard) };
	} catch {
		return null;
	}
}

export { projects as projectsFallback };
