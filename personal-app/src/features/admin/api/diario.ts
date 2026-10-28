import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/authorizedHttp';
import type { ApiBlog, ApiBlogLevel } from '../../../entities/admin/types';

/**
 * Browser-side diario operations. The drafts read and both mutations require
 * the active admin credential, so these calls only work in the browser.
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

/**
 * Removes an entry for good (`DELETE /blogs/:id`): irreversible, both for a
 * draft that was never shown and for a published post the landing links to.
 * The confirm dialog in the editor island is the only path to this call.
 */
export function deleteBlogEntry(id: number): Promise<void> {
	return deleteJson(`/blogs/${id}`);
}
