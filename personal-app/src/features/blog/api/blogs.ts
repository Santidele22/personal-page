import { getJson } from '../../../shared/api/http';
import type { Post, PostIcon } from '../../../entities/post/types';

/**
 * Public read of the diario API. The backend (`backend/src/blogs`) is the
 * single source of truth the admin panel edits and the landing renders, so
 * failed reads surface instead of silently falling back to the content
 * collection that used to feed these widgets (issue 28).
 */

/** A row as `GET /blogs` serves it — mirrors `Blog` field by field. */
export type ApiBlog = {
	id: number;
	slug: string;
	title: string;
	description: string;
	content: string;
	level: 'basico' | 'intermedio' | 'avanzado';
	createdAt: string;
	authorId: string;
	pubDate?: string | null;
	updatedDate?: string | null;
	category?: string | null;
	icon?: string | null;
	readMin?: number | null;
	featured?: boolean | null;
};

/** Icon union the portada cards accept (`entities/post/types`). */
const ICON_KEYS: PostIcon[] = ['compass', 'database', 'blocks', 'wrench', 'scale'];

/** Dotted calendar rendering the widgets use, e.g. «2026.10.15». */
function dottedDate(iso: string): string {
	return iso.slice(0, 10).replaceAll('-', '.');
}

/** Portada card the landing grid renders. The featured pin and ordering are the caller's. */
export function toPost(blog: ApiBlog): Post {
	const icon = blog.icon && (ICON_KEYS as string[]).includes(blog.icon) ? (blog.icon as PostIcon) : 'wrench';

	return {
		slug: blog.slug,
		title: blog.title,
		excerpt: blog.description,
		category: blog.category ?? 'Diario',
		icon,
		date: dottedDate(blog.pubDate ?? blog.createdAt),
		readMin: blog.readMin ?? 1,
		featured: blog.featured === true,
	};
}

// The grid pins one headline card (the featured flag), newest first after
// that choice (the ordering `widgets/blog/Blog.astro` has always rendered).
export function sortPosts(posts: ApiBlog[]): ApiBlog[] {
	return [...posts].sort((a, b) => {
		const featured = Number(b.featured === true) - Number(a.featured === true);
		if (featured !== 0) return featured;
		const left = a.pubDate ?? a.createdAt;
		const right = b.pubDate ?? b.createdAt;
		return right.localeCompare(left);
	});
}

/** Card rows in portada order (featured first, then newest first). */
export async function fetchBlogRows(serverOrigin?: string): Promise<ApiBlog[]> {
	return sortPosts(await getJson<ApiBlog[]>('/blogs', { serverOrigin }));
}

/** One entry with its markdown body, looked up by the public slug. */
export async function fetchBlogArticle(slug: string, serverOrigin?: string): Promise<ApiBlog | null> {
	try {
		return await getJson<ApiBlog>(`/blogs/slug/${encodeURIComponent(slug)}`, { serverOrigin });
	} catch {
		// Either the backend is down or no entry carries this slug: the route
		// answers 404 either way instead of inventing content.
		return null;
	}
}
