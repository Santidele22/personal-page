import { getJson, patchJson, postJson } from '../../../shared/api/http';
import type { ApiBlog, ApiBlogLevel } from '../../../entities/admin/types';

/**
 * Browser-side diario operations. The drafts read and both mutations require
 * the admin session cookie the shared helper sends (`credentials: 'include'`),
 * so these calls only work in the browser, never during a server render.
 *
 * Draft state is `pubDate: null` (issue 29): saving without a date keeps the
 * entry off the landing, and publishing sends the chosen date. The mutation
 * helpers throw the API message verbatim, which the modal surfaces as-is.
 */

/** Editable columns of an entry; `level` stays the backend default (`basico`). */
export type BlogEntryBody = {
	title: string;
	description: string;
	content: string;
	/** Omitted while the entry is a draft; present when it is published. */
	pubDate?: string;
	level?: ApiBlogLevel;
};

/** Drafts saved by the editor (`pubDate IS NULL`), admin session required. */
export function fetchDrafts(): Promise<ApiBlog[]> {
	return getJson<ApiBlog[]>('/blogs/drafts');
}

/** Creates both drafts (no `pubDate`) and published entries (with one). */
export function createBlogEntry(body: BlogEntryBody): Promise<void> {
	return postJson('/blogs', body);
}

/**
 * Updates an existing entry. Used to save changes on a draft and to publish it
 * (`{ pubDate }` over the stored content), so the draft keeps its `id`/slug.
 */
export function updateBlogEntry(id: number, body: Partial<BlogEntryBody>): Promise<void> {
	return patchJson(`/blogs/${id}`, body);
}
