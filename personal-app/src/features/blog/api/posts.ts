import type { Post, PostIcon } from '../../../entities/post/types';
import { posts } from '../../../entities/post/data';
import { getJson } from '../../../shared/api/http';

const POST_ICONS: PostIcon[] = ['compass', 'database', 'blocks', 'wrench', 'scale'];

/**
 * A blog row as `GET /blogs` serves it: the editorial body plus the optional
 * portada card columns the landing grid renders (`category`, `icon`,
 * `readMin`, `featured`).
 */
type ApiPost = {
	id: number;
	title: string;
	description: string;
	createdAt: string;
	category?: string | null;
	icon?: string | null;
	readMin?: number | null;
	featured?: boolean | null;
};

/**
 * The front-page cards of the diario (`widgets/blog/Blog.astro`). `null` only
 * means the request itself failed (API down, proxy misconfigured, server
 * without the backend): the widget then renders the values this section
 * shipped with, exactly like the profile loader. Empty storage answers `[]`
 * because the server-rendered page still needs at least one card to pick the
 * featured row, so an empty collection also falls back to the shipped copy.
 */
export async function fetchPosts(serverOrigin?: string): Promise<Post[] | null> {
	try {
		const blogs = await getJson<ApiPost[]>('/blogs', { serverOrigin });

		if (blogs.length === 0) {
			return null;
		}

		const cards = blogs.map((blog) => ({
			slug: String(blog.id),
			title: blog.title,
			excerpt: blog.description,
			category: blog.category ?? '',
			icon: POST_ICONS.includes(blog.icon as PostIcon) ? (blog.icon as PostIcon) : 'wrench',
			// Stored `YYYY-MM-DD…`, rendered with the site's dotted style.
			date: blog.createdAt.slice(0, 10).replaceAll('-', '.'),
			readMin: blog.readMin ?? 1,
			featured: blog.featured === true,
		}));

		// The grid pins one headline card: the featured flag selects it, and
		// order stays insertion order after that choice.
		return cards.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
	} catch {
		return null;
	}
}

export { posts as postsFallback };
