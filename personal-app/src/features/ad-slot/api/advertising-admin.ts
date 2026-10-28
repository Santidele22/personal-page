import { deleteJson, getJson, patchJson, postJson } from '../../../shared/api/authorizedHttp';

/**
 * Admin face of `/advertising-plans`: the CRUD the publicidad screen drives.
 * The public read lives in `./ad-slots.ts` (the landing consumes it); this
 * module never touches that flow.
 */

/**
 * A stored advertising plan as `GET /advertising-plans` serves it. The public
 * columns carry the slot face the landing renders; `null` means the admin
 * never filled them, which is why every one of them is optional.
 */
export type AdvertisingPlan = {
	id: number;
	price: number;
	description: string;
	slug?: string | null;
	name?: string | null;
	visibility?: string | null;
	moment?: string | null;
	format?: string | null;
	cadence?: string | null;
	note?: string | null;
};

/**
 * Body of `POST /advertising-plans` and `PATCH /advertising-plans/:id`. The
 * backend rejects empty strings with `@IsNotEmpty`, so the panel omits the
 * public fields the admin left blank instead of sending `''`; the optional
 * pairs disappear from the payload rather than travelling as null.
 */
export type AdvertisingPlanInput = {
	price: number;
	description: string;
	slug?: string;
	name?: string;
	visibility?: string;
	moment?: string;
	format?: string;
	cadence?: string;
	note?: string;
};

/** Public read; the admin shell gates the session, so no origin is needed. */
export function fetchAdvertisingPlans(): Promise<AdvertisingPlan[]> {
	return getJson<AdvertisingPlan[]>('/advertising-plans');
}

/** `POST /advertising-plans` — requires the admin session. */
export function createAdvertisingPlan(body: AdvertisingPlanInput): Promise<void> {
	return postJson('/advertising-plans', body);
}

/** `PATCH /advertising-plans/:id` — the backend merges the sent subset. */
export function updateAdvertisingPlan(id: number, body: AdvertisingPlanInput): Promise<void> {
	return patchJson(`/advertising-plans/${id}`, body);
}

/** `DELETE /advertising-plans/:id` — removes the plan from the stored list. */
export function deleteAdvertisingPlan(id: number): Promise<void> {
	return deleteJson(`/advertising-plans/${id}`);
}
