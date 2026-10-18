import { getJson } from '../../../shared/api/http';
import type { ApiAdvertisingPlan, ApiBlog, ApiBrand, ApiProject, ApiService } from '../../../entities/admin/types';

/**
 * Read slices of the admin panel. Every endpoint is a public `GET` in the
 * backend controllers, so the panel reads them without sending credentials;
 * `serverOrigin` resolves the relative `/api` base during a server-side render.
 */

export function fetchBlogs(serverOrigin?: string): Promise<ApiBlog[]> {
	return getJson<ApiBlog[]>('/blogs', { serverOrigin });
}

export function fetchBrands(serverOrigin?: string): Promise<ApiBrand[]> {
	return getJson<ApiBrand[]>('/brands', { serverOrigin });
}

export function fetchAdvertisingPlans(serverOrigin?: string): Promise<ApiAdvertisingPlan[]> {
	return getJson<ApiAdvertisingPlan[]>('/advertising-plans', { serverOrigin });
}

export function fetchProjects(serverOrigin?: string): Promise<ApiProject[]> {
	return getJson<ApiProject[]>('/projects', { serverOrigin });
}

export function fetchServices(serverOrigin?: string): Promise<ApiService[]> {
	return getJson<ApiService[]>('/services', { serverOrigin });
}
