import {
	toDiarioPosts,
	toDiarioStats,
	toOccupancy,
	toPublicidadKpis,
	toPublicidadSlots,
	toRenewals,
	toResumenKpis,
	toSlotStatusLines,
} from '../../../entities/admin/adapter';
import type {
	AdminDiarioView,
	AdminPublicidadView,
	AdminResumenView,
	AdminSummaryStat,
	ApiBlog,
} from '../../../entities/admin/types';
import { fetchAdvertisingPlans, fetchBlogs, fetchBrands, fetchProjects, fetchServices } from './collections';
import { fetchDrafts } from './diario';

/**
 * Dashboard loaders: fetch the collections a page needs and adapt them to the
 * widget props in a single call, so the page reads data and renders.
 */

/** Everything the diario island renders from its browser-side read. */
export type DiarioPanelData = {
	stats: AdminSummaryStat[];
	drafts: ApiBlog[];
};

/**
 * The published list the page renders while it server-renders. Stats are
 * computed from published entries alone because the drafts need the browser
 * session cookie; the live summary comes from `loadDiarioPanel` inside the
 * island.
 */
export async function loadDiario(serverOrigin?: string): Promise<AdminDiarioView> {
	const blogs = await fetchBlogs(serverOrigin);
	const posts = toDiarioPosts(blogs);

	// The table's contract stays owned by the adapter; the public slug the
	// «Ver» action needs lives on `ApiBlog`, so it is mapped onto the rows by
	// id here instead of widening what `toDiarioPosts` returns.
	const slugById = new Map(blogs.map((blog) => [String(blog.id), blog.slug]));

	return {
		stats: toDiarioStats(blogs),
		posts: posts.map((post) => ({ ...post, slug: slugById.get(post.id) })),
	};
}

/**
 * Browser-side diario read: published entries plus the admin drafts, combined
 * so the summary counts real drafts (issue 29). Call it from the island only;
 * `GET /blogs/drafts` needs the session cookie the browser carries.
 */
export async function loadDiarioPanel(): Promise<DiarioPanelData> {
	const [published, drafts] = await Promise.all([fetchBlogs(), fetchDrafts()]);

	return {
		stats: toDiarioStats([...published, ...drafts]),
		drafts,
	};
}

export async function loadPublicidad(serverOrigin?: string): Promise<AdminPublicidadView> {
	const [plans, brands] = await Promise.all([fetchAdvertisingPlans(serverOrigin), fetchBrands(serverOrigin)]);
	const now = new Date();

	return { kpis: toPublicidadKpis(plans, brands, now), slots: toPublicidadSlots(plans, brands, now) };
}

export async function loadResumen(serverOrigin?: string): Promise<AdminResumenView> {
	const [plans, brands, blogs, projects, services] = await Promise.all([
		fetchAdvertisingPlans(serverOrigin),
		fetchBrands(serverOrigin),
		fetchBlogs(serverOrigin),
		fetchProjects(serverOrigin),
		fetchServices(serverOrigin),
	]);
	const now = new Date();

	return {
		kpis: toResumenKpis(blogs, projects, services, brands, now),
		occupancy: toOccupancy(plans, brands, now),
		slotLines: toSlotStatusLines(plans, brands, now),
		...toRenewals(plans, brands, now),
	};
}
