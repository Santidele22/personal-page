import type { ProjectIcon, ProjectStatus } from '../../../entities/project/types';
import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/authorizedHttp';

/**
 * Admin CRUD for the `projects` domain. It is deliberately separate from the
 * landing loader (`./projects.ts`): the loader maps storage into the portada
 * cards and swallows failures, while the admin needs the stored rows and the
 * real error of each mutation. The authorized helper sends the credential for
 * the active auth mode, so the backend can reject anonymous writes.
 */

/**
 * A `projects` row exactly as `GET /projects` serves it: every stored column
 * including `ownerId`, which the panel never sends back (the backend derives
 * the owner from the authenticated admin session).
 */
export type AdminProjectRow = {
	id: number;
	url: string;
	name: string;
	description: string;
	technologies: string[];
	githubUrl?: string | null;
	ownerId: string;
	icon?: string | null;
	tagline?: string | null;
	status?: string | null;
	featured?: boolean | null;
};

/**
 * Body of `POST /projects` and `PATCH /projects/:id`. The owner is never
 * included. The optional card columns travel as `null` when the form leaves
 * them empty: the DTO marks them `@IsOptional()`, so `null` validates and
 * clears the stored column instead of failing with an empty string (`githubUrl`
 * would also fail its `@IsUrl()`).
 */
export type ProjectWriteBody = {
	url: string;
	name: string;
	description: string;
	technologies: string[];
	githubUrl: string | null;
	icon: ProjectIcon | null;
	tagline: string | null;
	status: ProjectStatus | null;
	featured: boolean;
};

/** Stored projects in storage order; throws so the panel can offer a retry. */
export function fetchAdminProjects(): Promise<AdminProjectRow[]> {
	return getJson<AdminProjectRow[]>('/projects');
}

/** Creates a project; a `400` carries the validation message the panel shows. */
export function createProject(body: ProjectWriteBody): Promise<void> {
	return postJson('/projects', body);
}

/** Replaces the editable columns of a stored project. */
export function updateProject(id: number, body: ProjectWriteBody): Promise<void> {
	return patchJson(`/projects/${id}`, body);
}

/** Removes a stored project. */
export function deleteProject(id: number): Promise<void> {
	return deleteJson(`/projects/${id}`);
}
