import type { AdSlotInfo } from '../../../entities/ad-slot/types';
import { adSlots } from '../../../entities/ad-slot/data';
import { getJson } from '../../../shared/api/http';

/**
 * An advertising plan row as `GET /advertising-plans` serves it. The optional
 * public columns carry the slot face the landing renders; plans without their
 * `slug` have no public placement and stay out of the lookup.
 */
export type ApiAdvertisingSlot = {
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
 * Maps one plan row to the slot face the landing renders. This is the only
 * place that formats a plan price (S10), so the advertising bands reuse it
 * instead of hardcoding currency or amounts. A plan without `slug` has no
 * public placement and maps to `null`.
 */
export function toAdSlotInfo(plan: ApiAdvertisingSlot): AdSlotInfo | null {
	if (!plan.slug) return null;

	return {
		id: plan.slug as AdSlotInfo['id'],
		name: plan.name ?? '',
		visibility: plan.visibility ?? '',
		moment: plan.moment ?? '',
		format: plan.format ?? '',
		price: `USD ${plan.price}`,
		cadence: plan.cadence ?? '',
		note: plan.note ?? plan.description,
	};
}

/**
 * The public slots the landing renders (the "marcas" grid, the footer seal and
 * the flow slot of the blog grid). `null` only means the request itself failed
 * (API down, proxy misconfigured, server without the backend): widgets then
 * render the values the block shipped with, exactly like the profile loader.
 * An empty stored collection answers `[]` (nothing to render): the admin chose
 * to show no slots, so that is not a fallback case.
 */
export async function fetchAdSlots(serverOrigin?: string): Promise<AdSlotInfo[] | null> {
	try {
		const plans = await getJson<ApiAdvertisingSlot[]>('/advertising-plans', { serverOrigin });

		return plans.map(toAdSlotInfo).filter((slot): slot is AdSlotInfo => slot !== null);
	} catch {
		return null;
	}
}

/** The slots merged over the fallback response (kept public for the widgets). */
export { adSlots as adSlotsFallback };
