import { isBrandActive } from '../../../entities/admin/adapter';
import type { ApiAdvertisingPlan, ApiBrand } from '../../../entities/admin/types';
import type { AdBandPayload, AdBandPrice, SponsorCarouselItem } from '../../../entities/ad-slot/types';
/** Reexport the shipped slot copy; the entity data owns the printed prices. */
import { adSlots as adSlotsFallback } from '../../../entities/ad-slot/data';
import { toAdSlotInfo } from './ad-slots';

/**
 * Pure composition of the two landing bands (S1, S2, S5). It receives the
 * public read models the page already fetched, decides which brands are
 * sponsors and which plans are still available, and splits both by band:
 *
 * - a plan with an active brand is occupied and never offered (S5);
 * - sponsors of the `pie` plan go to the footer band, every other sponsor to
 *   the hero band (A3);
 * - available `pie` plans are the footer offer, available `patrono`,
 *   `lectura`, `flujo` and `carta` plans the hero offers, in API order;
 * - sponsors come first in each band and offers complete it (S2).
 *
 * The band with no data at all (or a failed read) shows neither the shipped
 * slot copy nor a collapsed strip: a single dashed placekeeper square passes,
 * so the reserved ad space stays visible without publishing any offer (L9).
 */

/** Public columns the API adds to a plan row beyond the admin DTO. */
export type CarruselPlan = ApiAdvertisingPlan & {
	slug?: string | null;
	name?: string | null;
	visibility?: string | null;
	moment?: string | null;
	format?: string | null;
	cadence?: string | null;
	note?: string | null;
};

/**
 * A brand as `GET /brands` serves it. `plan` is the relation T1 adds; older
 * responses without it are still usable because the plan lookup falls back to
 * `planId` against the plans list. `url` is optional and only feeds the link.
 */
export type CarruselBrand = ApiBrand & {
	url?: string | null;
	plan?: CarruselPlan | null;
};

export type CarruselBands = {
	hero: AdBandPayload;
	footer: AdBandPayload;
};

/** Copy of the bands, verbatim from the reference captures (A4). */
const HERO_HEADING = 'CON EL APOYO DE';
const FOOTER_HEADING = 'SELLOS DE MARCAS AMIGAS';

/** Plans whose unavailable card belongs to the hero band, in API order. */
const HERO_SLUGS = new Set(['patrono', 'lectura', 'flujo', 'carta']);
/** The footer seal (A1). */
const FOOTER_SLUG = 'pie';

type ComposeInput = {
	plans: CarruselPlan[] | null;
	brands: CarruselBrand[] | null;
	now: Date;
};

export function composeAdBands({ plans, brands, now }: ComposeInput): CarruselBands {
	const heroItems: SponsorCarouselItem[] = [];
	const footerItems: SponsorCarouselItem[] = [];
	const safePlans = plans ?? [];
	const safeBrands = brands ?? [];
	const noData = !safePlans.length && !safeBrands.length;

	if (noData) {
		// With nothing loaded the band keeps only the reserved spot: a dashed
		// placekeeper square, the space the carousel would occupy (L9). Its CTA
		// row still names the default prices from the shipped slot copy (L10).
		heroItems.push({ kind: 'placeholder' });
		footerItems.push({ kind: 'placeholder' });
	} else {
		pushSponsors(heroItems, footerItems, safePlans, safeBrands, now);
		pushOffers(heroItems, footerItems, safePlans, safeBrands, now);
	}

	// A2: the CTA features the highest-priced available offer of the band; with
	// no data at all the shipped slot copy supplies those default prices (L10).
	const featured = highestPricedOffer(heroItems) ?? (noData ? defaultOffer(HERO_SLUGS) : null);
	// A1: the footer seal is only offered while its plan is available.
	const seal =
		highestPricedOffer(footerItems.filter((item) => item.kind === 'offer' && item.ad.id === FOOTER_SLUG)) ??
		(noData ? defaultOffer(new Set([FOOTER_SLUG])) : null);

	return {
		hero: {
			variant: 'hero',
			heading: HERO_HEADING,
			items: heroItems,
			featured,
			seal: null,
		},
		footer: {
			variant: 'footer',
			heading: FOOTER_HEADING,
			items: footerItems,
			featured,
			seal,
		},
	};
}

/** Active brands first, split by the plan their brand paid for. */
function pushSponsors(
	heroItems: SponsorCarouselItem[],
	footerItems: SponsorCarouselItem[],
	plans: CarruselPlan[],
	brands: CarruselBrand[],
	now: Date,
): void {
	const planById = new Map(plans.map((plan) => [plan.id, plan]));

	for (const brand of brands) {
		if (!isBrandActive(brand, now)) continue;

		// The nested relation is newest; fall back to `planId` for older payloads.
		const plan = brand.plan ?? planById.get(brand.planId) ?? null;
		const item: SponsorCarouselItem = {
			kind: 'sponsor',
			id: brand.id,
			name: brand.name,
			imageUrl: brand.imageUrl,
			url: brand.url ?? null,
		};

		if (plan?.slug === FOOTER_SLUG) footerItems.push(item);
		else heroItems.push(item);
	}
}

/** Offers complete each band, skipping plans an active brand already occupies. */
function pushOffers(
	heroItems: SponsorCarouselItem[],
	footerItems: SponsorCarouselItem[],
	plans: CarruselPlan[],
	brands: CarruselBrand[],
	now: Date,
): void {
	const occupied = new Set(brands.filter((brand) => isBrandActive(brand, now)).map((brand) => brand.planId));

	for (const plan of plans) {
		if (!plan.slug || occupied.has(plan.id)) continue;

		const ad = toAdSlotInfo(plan);
		if (!ad) continue;

		if (plan.slug === FOOTER_SLUG) footerItems.push({ kind: 'offer', ad });
		else if (HERO_SLUGS.has(plan.slug)) heroItems.push({ kind: 'offer', ad });
	}
}

/** Cheap offer view of the shipped slot copy, filtered by band slugs (L10). */
function fallbackOffers(slugs: Set<string>): SponsorCarouselItem[] {
	return adSlotsFallback
		.filter((ad) => slugs.has(ad.id))
		.map((ad): SponsorCarouselItem => ({ kind: 'offer', ad }));
}

/** Highest-priced shipped offer, so an empty band still quotes a price (L10). */
function defaultOffer(slugs: Set<string>): AdBandPrice | null {
	return highestPricedOffer(fallbackOffers(slugs));
}

/**
 * Price of the most expensive offer. The string is already formatted by
 * `toAdSlotInfo`, so only its numeric part is read back for the comparison;
 * no currency is hardcoded here.
 */
function highestPricedOffer(items: SponsorCarouselItem[]): AdBandPrice | null {
	let best: AdBandPrice | null = null;
	let bestValue = Number.NEGATIVE_INFINITY;

	for (const item of items) {
		if (item.kind !== 'offer') continue;

		const value = Number.parseFloat(item.ad.price.replace(/[^\d.]/g, ''));
		if (!Number.isFinite(value) || value <= bestValue) continue;

		bestValue = value;
		best = { price: item.ad.price, cadence: item.ad.cadence };
	}

	return best;
}
