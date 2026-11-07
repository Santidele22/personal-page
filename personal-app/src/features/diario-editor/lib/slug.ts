/**
 * Slug preview for the drawer. Mirrors the backend `slugify`
 * (`backend/src/blogs/blogs.service.ts`) field for field so what the editor
 * shows is exactly the URL `POST /blogs` will store.
 */

/** Longest slug the `Blog.slug` column accepts (backend constant). */
const SLUG_MAX_LENGTH = 120;

export function titleSlug(value: string): string {
	const folded = value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return (folded || 'entrada').slice(0, SLUG_MAX_LENGTH);
}

/** `/blog/<slug>` line the drawer renders; `…` while the title is empty. */
export function slugPreviewPath(title: string): string {
	if (!title.trim()) return '/blog/…';

	return `/blog/${titleSlug(title)}`;
}
