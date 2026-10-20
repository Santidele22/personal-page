import type { Project, ProjectIcon, ProjectStatus } from '../../../entities/project/types';
import { projects } from '../../../entities/project/data';
import { getJson } from '../../../shared/api/http';
import { safeHref } from '../../../shared/api/url';

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

			// Esquemas http/https/mailto únicamente (issue 38): una URL
			// administrable con otro esquema queda vacía y la tarjeta omite
			// ese enlace en vez de renderizarlo.
			const repo = safeHref(project.githubUrl ?? project.url) ?? '';
			// A demo row that holed at the repo URL is not a demo; the card then
			// renders only the repository link instead of a lying Demo anchor.
			const demo = project.url === project.githubUrl ? undefined : project.url;

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
				repoUrl: repo,
				demoUrl: safeHref(demo),
				featured: project.featured === true,
			};
		});
	} catch {
		return null;
	}
}

export { projects as projectsFallback };
