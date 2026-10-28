import type { ServiceIcon } from '../../../entities/service/types';
import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/authorizedHttp';

/**
 * Admin CRUD for the `services` domain. It is deliberately separate from the
 * landing loader (`./services.ts`): the loader maps storage into the portada
 * cards and swallows failures, while the admin needs the stored rows and the
 * real error of each mutation. The authorized helper sends the credential for
 * the active auth mode, so the backend can reject anonymous writes.
 */

/**
 * A `services` row exactly as `GET /services` serves it: every stored column
 * including `userId`, which the panel never sends back (the backend derives the
 * owner from the authenticated admin session).
 */
export type AdminServiceRow = {
	id: number;
	name: string;
	description: string;
	features: string[];
	price: number;
	userId: string;
	icon?: string | null;
	priceLabel?: string | null;
};

/**
 * Body of `POST /services` and `PATCH /services/:id`. The owner is never
 * included. The optional portada columns travel as `null` when the form leaves
 * them empty: the DTO marks them `@IsOptional()`, so `null` validates and
 * clears the stored column instead of failing with an empty string.
 */
export type ServiceWriteBody = {
	name: string;
	description: string;
	features: string[];
	price: number;
	icon: ServiceIcon | null;
	priceLabel: string | null;
};

/** Stored services in storage order; throws so the panel can offer a retry. */
export function fetchAdminServices(): Promise<AdminServiceRow[]> {
	return getJson<AdminServiceRow[]>('/services');
}

/** Creates a service; a `400` carries the validation message the panel shows. */
export function createService(body: ServiceWriteBody): Promise<void> {
	return postJson('/services', body);
}

/** Replaces the editable columns of a stored service. */
export function updateService(id: number, body: ServiceWriteBody): Promise<void> {
	return patchJson(`/services/${id}`, body);
}

/** Removes a stored service. */
export function deleteService(id: number): Promise<void> {
	return deleteJson(`/services/${id}`);
}
