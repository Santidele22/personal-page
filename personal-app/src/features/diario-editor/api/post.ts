import { getJson, patchJson, postJsonReturning } from '../../../shared/api/authorizedHttp';
import type { ApiBlog, ApiBlogLevel } from '../../../entities/admin/types';

/**
 * CRUD del editor full-page del diario (`/admin/diario/nueva` y
 * `/admin/diario/[id]`). Vive en su propio slice para no crucear imports
 * entre features: el panel de la lista sigue con `features/admin/api/diario.ts`.
 *
 * Los cuerpos son parciales en PATCH (`PATCH /blogs/:id` fusiona solo lo
 * enviado en el backend): guardar sin fecha mantiene el estado de borrador y
 * `category` viaja única como texto separado por comas — el backend almacena
 * una sola columna, los chips del drawer se serializan ahí.
 */

export type PostBody = {
	title: string;
	description: string;
	content: string;
	/** Omitted while the entry stays a draft; present to publish it. */
	pubDate?: string;
	level?: ApiBlogLevel;
	/** Single backend column: chips joined with `, `. Omitted without chips. */
	category?: string;
	featured?: boolean;
	readMin?: number;
};

/** Shape the backend answers `POST /blogs` with — only the `id` is read. */
export type CreatedPost = { id: number };

/** Drafts (`pubDate IS NULL`), admin session required. */
export function fetchEditorDrafts(): Promise<ApiBlog[]> {
	return getJson<ApiBlog[]>('/blogs/drafts');
}

/** Published archive (`pubDate NOT NULL`), public read. */
export function fetchPublishedEntries(): Promise<ApiBlog[]> {
	return getJson<ApiBlog[]>('/blogs');
}

export function createPost(body: PostBody): Promise<CreatedPost> {
	return postJsonReturning<CreatedPost>('/blogs', body);
}

export function updatePost(id: number, body: Partial<PostBody>): Promise<void> {
	return patchJson(`/blogs/${id}`, body);
}
