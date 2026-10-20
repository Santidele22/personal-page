export type AdSlotInfo = {
	id: 'pie' | 'flujo' | 'lectura' | 'carta' | 'patrono';
	name: string;
	visibility: string;
	moment: string;
	format: string;
	price: string;
	cadence: string;
	note: string;
};

/** Price segment of a CTA row, already formatted by the ad-slot API mapping. */
export type AdBandPrice = { price: string; cadence: string };

/**
 * Cards the landing bands rotate. A sponsor is a brand that already paid for
 * its plan; an offer is a still-available plan rendered as a quiet seal
 * (S7). The union is the contract between the pure composition
 * (`features/ad-slot/api/carrusel.ts`) and the band component.
 */
export type SponsorCarouselItem =
	| { kind: 'sponsor'; id: number; name: string; imageUrl: string; url?: string | null }
	| { kind: 'offer'; ad: AdSlotInfo }
	| { kind: 'placeholder' };

/** Server-rendered band payload: heading, seals and the CTA price segments. */
export type AdBandPayload = {
	variant: 'hero' | 'footer';
	heading: string;
	items: SponsorCarouselItem[];
	/** Highest-priced available hero offer (A2), or `null` with no plan data. */
	featured: AdBandPrice | null;
	/** Available `pie` plan (A1), or `null` when taken/absent. */
	seal: AdBandPrice | null;
};
