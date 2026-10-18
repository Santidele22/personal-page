import type { Project, ProjectIcon, ProjectStatus } from '../../../entities/project/types';
import { projects } from '../../../entities/project/data';
import { getJson } from '../../../shared/api/http';

const PROJECT_ICONS: ProjectIcon[] = ['sprout', 'feather', 'blocks', 'wrench'];
const PROJECT_STATUSES: ProjectStatus[] = ['en-produccion', 'en-construccion', 'codigo-abierto'];

/** Rendered label of each stored status key. */
const STATUS_LABELS: Record<ProjectStatus, string> = {
	'en-produccion': 'En producción',
	'en-construccion': 'En construcción',
	'codigo-abierto': 'Código abierto',
};

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
	featured?: boolean | null;
};

/**
 * The projects cards (`widgets/projects/Projects.astro`). `null` only means
 * the request itself failed (API down, proxy misconfigured, server without the
 * backend): the widget then renders the values the block shipped with exactly
 * like the profile loader. Empty storage answers `[]`: the backend is the
 * only source of truth, so the section renders without cards until the admin
 * publishes one.
 */
export async function fetchProjects(serverOrigin?: string): Promise<Project[] | null> {
	try {
		const rows = await getJson<ApiProjectCard[]>('/projects', { serverOrigin });

		return rows.map((project) => {
			const status = PROJECT_STATUSES.includes(project.status as ProjectStatus)
				? (project.status as ProjectStatus)
				: 'en-construccion';

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
				repoUrl: project.githubUrl ?? project.url,
				demoUrl: project.url,
				featured: project.featured === true,
			};
		});
	} catch {
		return null;
	}
}

export { projects as projectsFallback };
