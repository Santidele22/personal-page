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
import type { AdminDiarioView, AdminPublicidadView, AdminResumenView } from '../../../entities/admin/types';
import { fetchAdvertisingPlans, fetchBlogs, fetchBrands, fetchProjects, fetchServices } from './collections';

/**
 * Dashboard loaders: fetch the collections a page needs and adapt them to the
 * widget props in a single call, so the page reads data and renders.
 */

export async function loadDiario(serverOrigin?: string): Promise<AdminDiarioView> {
	const blogs = await fetchBlogs(serverOrigin);

	return { stats: toDiarioStats(blogs), posts: toDiarioPosts(blogs) };
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
