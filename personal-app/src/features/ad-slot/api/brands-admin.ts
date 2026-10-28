import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/authorizedHttp';
import type { ApiBrand } from '../../../entities/admin/types';

/**
 * Admin face of `/brands`: the sponsors that occupy a stored advertising plan.
 * The public read the landing consumes lives in `./ad-slots.ts`; this module
 * never touches that flow.
 */

/**
 * Body of `POST /brands` and `PATCH /brands/:id`. `name` and `imageUrl` are
 * required by the DTO; `url` is the optional sponsor link and `activeUntil`
 * the optional expiration. The backend rejects empty strings, so the panel
 * omits the optional fields the admin left blank instead of sending `''`.
 */
export type BrandInput = {
	name: string;
	imageUrl: string;
	url?: string;
	planId: number;
	activeUntil?: string;
};

/** Public read; the admin shell gates the session, so no origin is needed. */
export function fetchBrands(): Promise<ApiBrand[]> {
	return getJson<ApiBrand[]>('/brands');
}

/** `POST /brands` — requires the admin session. */
export function createBrand(body: BrandInput): Promise<void> {
	return postJson('/brands', body);
}

/** `PATCH /brands/:id` — the backend merges the sent subset. */
export function updateBrand(id: number, body: BrandInput): Promise<void> {
	return patchJson(`/brands/${id}`, body);
}

/** `DELETE /brands/:id` — the plan relation rejects deleting a referenced row. */
export function deleteBrand(id: number): Promise<void> {
	return deleteJson(`/brands/${id}`);
}

/**
 * The plan selector reads the same collection the plans panel drives, so it
 * reuses that read instead of duplicating the request here.
 */
export { fetchAdvertisingPlans as fetchBrandPlans } from './advertising-admin';
