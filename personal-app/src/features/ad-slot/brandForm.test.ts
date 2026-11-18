import { describe, expect, it } from 'vitest';

import type { ApiBrand } from '../../entities/admin/types';
import type { AdvertisingPlan } from './api/advertising-admin';
import {
	EMPTY_BRAND_FORM,
	brandFormToBody,
	brandToForm,
	planLabel,
	validateBrandForm,
	validityOf,
} from './brandForm';
import type { BrandFormState } from './brandForm';

const VALID_FORM: BrandFormState = {
	name: 'Marca',
	imageUrl: 'https://cdn.example.com/logo.png',
	url: 'https://marca.example.com',
	planId: '3',
	activeUntil: '2026-10-12',
};

const NOW = new Date('2026-06-01T00:00:00.000Z');

describe('brandToForm', () => {
	it('maps a stored brand into editable form state', () => {
		const brand: ApiBrand = {
			id: 5,
			name: 'Marca',
			imageUrl: 'https://cdn.example.com/logo.png',
			url: 'https://marca.example.com',
			activeUntil: '2026-10-12T00:00:00.000Z',
			createdAt: '2026-01-01T00:00:00.000Z',
			planId: 3,
		};

		expect(brandToForm(brand)).toEqual({
			name: 'Marca',
			imageUrl: 'https://cdn.example.com/logo.png',
			url: 'https://marca.example.com',
			planId: '3',
			activeUntil: '2026-10-12',
		});
	});

	it('defaults the optional link and validity to blank strings', () => {
		const brand: ApiBrand = {
			id: 6,
			name: 'Sin enlace',
			imageUrl: 'https://cdn.example.com/otro.png',
			url: null,
			activeUntil: null,
			createdAt: '2026-01-01T00:00:00.000Z',
			planId: 12,
		};

		expect(brandToForm(brand)).toEqual({
			name: 'Sin enlace',
			imageUrl: 'https://cdn.example.com/otro.png',
			url: '',
			planId: '12',
			activeUntil: '',
		});
	});

	it('renders the plan id as text and slices the ISO timestamp to a date input value', () => {
		const brand: ApiBrand = {
			id: 7,
			name: 'Marca',
			imageUrl: 'https://cdn.example.com/logo.png',
			url: undefined,
			activeUntil: '2027-01-31T18:30:00.000Z',
			createdAt: '2026-01-01T00:00:00.000Z',
			planId: 41,
		};

		const form = brandToForm(brand);

		expect(form.planId).toBe('41');
		expect(form.activeUntil).toBe('2027-01-31');
		expect(form.url).toBe('');
	});
});

describe('validateBrandForm', () => {
	it('returns null for a valid form', () => {
		expect(validateBrandForm(VALID_FORM)).toBeNull();
	});

	it('requires a name', () => {
		const message = 'La marca necesita un nombre.';

		expect(validateBrandForm({ ...VALID_FORM, name: '' })).toBe(message);
		expect(validateBrandForm({ ...VALID_FORM, name: '   ' })).toBe(message);
	});

	it('requires the logo image URL', () => {
		const message = 'La marca necesita un logo: la URL de la imagen.';

		expect(validateBrandForm({ ...VALID_FORM, imageUrl: '' })).toBe(message);
		expect(validateBrandForm({ ...VALID_FORM, imageUrl: '   ' })).toBe(message);
	});

	it('requires the plan the brand occupies', () => {
		const message = 'Elige el plan que ocupa la marca.';

		expect(validateBrandForm({ ...VALID_FORM, planId: '' })).toBe(message);
		expect(validateBrandForm({ ...VALID_FORM, planId: 'abc' })).toBe(message);
		expect(validateBrandForm({ ...VALID_FORM, planId: '1.5' })).toBe(message);
	});

	it('rejects an unparseable validity and accepts an empty one', () => {
		expect(validateBrandForm({ ...VALID_FORM, activeUntil: 'no-es-fecha' })).toBe(
			'La vigencia tiene que ser una fecha válida.',
		);
		expect(validateBrandForm({ ...VALID_FORM, activeUntil: '' })).toBeNull();
		expect(validateBrandForm({ ...VALID_FORM, activeUntil: '   ' })).toBeNull();
		expect(validateBrandForm({ ...VALID_FORM, activeUntil: '2027-01-31' })).toBeNull();
	});

	it('reports the first problem in the same order as the form fields', () => {
		expect(validateBrandForm(EMPTY_BRAND_FORM)).toBe('La marca necesita un nombre.');
		expect(validateBrandForm({ ...EMPTY_BRAND_FORM, name: 'Marca' })).toBe(
			'La marca necesita un logo: la URL de la imagen.',
		);
		expect(validateBrandForm({ ...EMPTY_BRAND_FORM, name: 'Marca', imageUrl: 'https://x/y.png' })).toBe(
			'Elige el plan que ocupa la marca.',
		);
		expect(
			validateBrandForm({
				...EMPTY_BRAND_FORM,
				name: 'Marca',
				imageUrl: 'https://x/y.png',
				planId: '2',
				activeUntil: 'ayer',
			}),
		).toBe('La vigencia tiene que ser una fecha válida.');
	});
});

describe('brandFormToBody', () => {
	it('trims the required fields and keeps the optional pair', () => {
		expect(
			brandFormToBody({
				...VALID_FORM,
				name: '  Marca  ',
				imageUrl: '  https://cdn.example.com/logo.png  ',
				url: '  https://marca.example.com  ',
			}),
		).toEqual({
			name: 'Marca',
			imageUrl: 'https://cdn.example.com/logo.png',
			url: 'https://marca.example.com',
			planId: 3,
			activeUntil: '2026-10-12',
		});
	});

	it('omits the optional fields the admin left blank', () => {
		const body = brandFormToBody({ ...VALID_FORM, url: '   ', activeUntil: '' });

		expect(body).toEqual({
			name: 'Marca',
			imageUrl: 'https://cdn.example.com/logo.png',
			planId: 3,
		});
		// The JSON body drops these: an omitted field leaves the stored value alone.
		expect(body.url).toBeUndefined();
		expect(body.activeUntil).toBeUndefined();
	});

	it('sends the plan id as the integer the DTO validates', () => {
		expect(brandFormToBody({ ...VALID_FORM, planId: '41' }).planId).toBe(41);
	});
});

describe('planLabel', () => {
	const plans: AdvertisingPlan[] = [
		{ id: 2, price: 90, description: 'Slot del pie de página.' },
		{ id: 5, price: 140, description: 'Cabecera de lectura.' },
	];

	it('uses the stored plan description', () => {
		expect(planLabel(plans, 5)).toBe('Cabecera de lectura.');
	});

	it('falls back to the plan number when the plan is gone', () => {
		expect(planLabel(plans, 9)).toBe('Plan #9');
		expect(planLabel([], 9)).toBe('Plan #9');
	});
});

describe('validityOf', () => {
	function brand(activeUntil: string | null): ApiBrand {
		return {
			id: 1,
			name: 'Marca',
			imageUrl: 'https://cdn.example.com/logo.png',
			url: null,
			activeUntil,
			createdAt: '2026-01-01T00:00:00.000Z',
			planId: 3,
		};
	}

	it('reports a brand without expiry as active', () => {
		expect(validityOf(brand(null), NOW)).toEqual({ text: 'Sin vencimiento', active: true });
	});

	it('reports the remaining validity as active', () => {
		expect(validityOf(brand('2026-10-12T00:00:00.000Z'), NOW)).toEqual({
			text: 'Hasta el 12 oct 2026',
			active: true,
		});
	});

	it('reports an expired brand with the day it expired', () => {
		expect(validityOf(brand('2026-03-04T00:00:00.000Z'), NOW)).toEqual({
			text: 'Vencida el 4 mar 2026',
			active: false,
		});
	});

	it('keeps a brand that expires exactly now active, like the dashboard adapter', () => {
		expect(validityOf(brand('2026-06-01T00:00:00.000Z'), NOW)).toEqual({
			text: 'Hasta el 1 jun 2026',
			active: true,
		});
	});
});
