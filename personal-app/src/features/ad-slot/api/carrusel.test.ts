import { describe, expect, it } from 'vitest';

import { composeAdBands, hasActiveSponsors, type CarruselBrand, type CarruselPlan } from './carrusel';

const NOW = new Date('2026-11-21T12:00:00.000Z');

const HERO_PLAN: CarruselPlan = {
	id: 1,
	price: 120,
	description: 'Patrono',
	slug: 'patrono',
	name: 'Patrono',
	visibility: 'Hero',
	moment: 'Portada',
	format: 'Card',
	cadence: '/ mes',
};

const FOOTER_PLAN: CarruselPlan = {
	id: 2,
	price: 45,
	description: 'Pie',
	slug: 'pie',
	name: 'Pie',
	visibility: 'Footer',
	moment: 'Pie de página',
	format: 'Sello',
	cadence: '/ mes',
};

function makeBrand(overrides: Partial<CarruselBrand> = {}): CarruselBrand {
	return {
		id: 10,
		name: 'Acme',
		imageUrl: 'https://example.test/logo.png',
		url: 'https://example.test',
		activeUntil: '2026-12-31T00:00:00.000Z',
		createdAt: '2026-11-01T00:00:00.000Z',
		planId: 1,
		...overrides,
	};
}

describe('hasActiveSponsors', () => {
	it('returns false when composeAdBands has no data (placeholders only)', () => {
		const bands = composeAdBands({ plans: [], brands: [], now: NOW });

		expect(hasActiveSponsors(bands.hero)).toBe(false);
		expect(hasActiveSponsors(bands.footer)).toBe(false);
	});

	it('returns false when plans exist without any active brands (offers only)', () => {
		const bands = composeAdBands({
			plans: [HERO_PLAN, FOOTER_PLAN],
			brands: [makeBrand({ activeUntil: '2026-10-01T00:00:00.000Z' })],
			now: NOW,
		});

		expect(hasActiveSponsors(bands.hero)).toBe(false);
		expect(hasActiveSponsors(bands.footer)).toBe(false);
	});

	it('returns true only for the band holding an active sponsor', () => {
		const heroOnly = composeAdBands({
			plans: [HERO_PLAN, FOOTER_PLAN],
			brands: [makeBrand({ planId: HERO_PLAN.id })],
			now: NOW,
		});
		expect(hasActiveSponsors(heroOnly.hero)).toBe(true);
		expect(hasActiveSponsors(heroOnly.footer)).toBe(false);

		const footerOnly = composeAdBands({
			plans: [HERO_PLAN, FOOTER_PLAN],
			brands: [makeBrand({ planId: FOOTER_PLAN.id })],
			now: NOW,
		});
		expect(hasActiveSponsors(footerOnly.hero)).toBe(false);
		expect(hasActiveSponsors(footerOnly.footer)).toBe(true);
	});
});
