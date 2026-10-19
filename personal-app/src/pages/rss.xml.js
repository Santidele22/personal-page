import rss from '@astrojs/rss';
import { fetchBlogRows } from '../features/blog/api/blogs';
import { SITE_DESCRIPTION, SITE_TITLE } from '../app/config/site';

export async function GET(context) {
	// The diario lives in the backend (issue 28): the feed is served fresh on
	// every request and misses entries only while the API is down.
	const posts = await fetchBlogRows(context.url.origin);

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			title: post.title,
			description: post.description,
			pubDate: new Date(post.pubDate ?? post.createdAt),
			link: `/blog/${post.slug}/`,
			content: post.content,
		})),
	});
}
