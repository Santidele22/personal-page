import { describe, expect, it } from 'vitest';

import type { AdvertisingPlan } from './api/advertising-admin';
import {
	EMPTY_ADVERTISING_PLAN_FORM,
	PUBLIC_PLAN_FIELDS,
	advertisingPlanFormToBody,
	advertisingPlanToForm,
	hasPublicFields,
	publicPlanRows,
	validateAdvertisingPlanForm,
} from './advertisingPlanForm';
import type { AdvertisingPlanFormState } from './advertisingPlanForm';

const VALID_FORM: AdvertisingPlanFormState = {
	price: '120',
	description: 'Slot del pie de página.',
	slug: 'pie',
	name: 'Pie de página',
	visibility: 'discreto',
	moment: 'pie',
	format: 'estático',
	cadence: '/mes',
	note: 'Una línea de nota.',
};

describe('hasPublicFields', () => {
	it('is false when every public slot column is empty', () => {
		expect(hasPublicFields(EMPTY_ADVERTISING_PLAN_FORM)).toBe(false);
	});

	it('is true as soon as one public slot column has a value', () => {
		expect(hasPublicFields({ ...EMPTY_ADVERTISING_PLAN_FORM, slug: 'pie' })).toBe(true);
		expect(hasPublicFields({ ...EMPTY_ADVERTISING_PLAN_FORM, note: 'nota' })).toBe(true);
	});

	it('counts a whitespace-only value as filled, like the current disclosure did', () => {
		expect(hasPublicFields({ ...EMPTY_ADVERTISING_PLAN_FORM, name: ' ' })).toBe(true);
	});
});

describe('advertisingPlanToForm', () => {
	it('maps a stored plan into editable form state', () => {
		const plan: AdvertisingPlan = {
			id: 7,
			price: 120.5,
			description: 'Slot del pie de página.',
			slug: 'pie',
			name: 'Pie de página',
			visibility: 'discreto',
			moment: 'pie',
			format: 'estático',
			cadence: '/mes',
			note: 'Una línea de nota.',
		};

		expect(advertisingPlanToForm(plan)).toEqual({
			price: '120.5',
			description: 'Slot del pie de página.',
			slug: 'pie',
			name: 'Pie de página',
			visibility: 'discreto',
			moment: 'pie',
			format: 'estático',
			cadence: '/mes',
			note: 'Una línea de nota.',
		});
	});

	it('renders the price as text and defaults every empty public column to a blank string', () => {
		const plan: AdvertisingPlan = {
			id: 1,
			price: 90,
			description: 'Sin cara pública todavía.',
			slug: null,
			name: null,
			visibility: null,
			moment: null,
			format: null,
			cadence: null,
			note: null,
		};

		expect(advertisingPlanToForm(plan)).toEqual({
			price: '90',
			description: 'Sin cara pública todavía.',
			slug: '',
			name: '',
			visibility: '',
			moment: '',
			format: '',
			cadence: '',
			note: '',
		});
	});
});

describe('validateAdvertisingPlanForm', () => {
	it('returns null for a valid form', () => {
		expect(validateAdvertisingPlanForm(VALID_FORM)).toBeNull();
	});

	it('requires a positive price with at most two decimals', () => {
		const message = 'El precio tiene que ser un número de hasta dos decimales y sin signo.';

		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: '' })).toBe(message);
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: '   ' })).toBe(message);
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: '-5' })).toBe(message);
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: '+5' })).toBe(message);
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: '1.234' })).toBe(message);
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: '120USD' })).toBe(message);
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: '1e3' })).toBe(message);
	});

	it('accepts decimals, a Spanish comma, and surrounding blanks', () => {
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: '120.5' })).toBeNull();
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: '120.50' })).toBeNull();
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, price: ' 120,5 ' })).toBeNull();
	});

	it('requires the description', () => {
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, description: '' })).toBe(
			'La descripción es obligatoria: es lo que explica el plan.',
		);
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, description: '   ' })).toBe(
			'La descripción es obligatoria: es lo que explica el plan.',
		);
	});

	it('reports the price problem before the description problem', () => {
		expect(
			validateAdvertisingPlanForm({ ...EMPTY_ADVERTISING_PLAN_FORM, price: 'abc', description: '' }),
		).toBe('El precio tiene que ser un número de hasta dos decimales y sin signo.');
	});

	it('never rejects an empty public slot column', () => {
		expect(validateAdvertisingPlanForm({ ...VALID_FORM, slug: '', name: '', note: '' })).toBeNull();
	});
});

describe('advertisingPlanFormToBody', () => {
	it('trims the description, parses the price, and keeps the filled public columns', () => {
		expect(
			advertisingPlanFormToBody({
				...VALID_FORM,
				price: ' 120,5 ',
				description: '  Slot del pie de página.  ',
				slug: ' pie ',
			}),
		).toEqual({
			price: 120.5,
			description: 'Slot del pie de página.',
			slug: 'pie',
			name: 'Pie de página',
			visibility: 'discreto',
			moment: 'pie',
			format: 'estático',
			cadence: '/mes',
			note: 'Una línea de nota.',
		});
	});

	it('omits blank public columns instead of sending empty strings', () => {
		const body = advertisingPlanFormToBody({
			...EMPTY_ADVERTISING_PLAN_FORM,
			price: '90',
			description: 'Solo precio y descripción.',
			slug: '   ',
			note: '',
		});

		expect(body).toEqual({ price: 90, description: 'Solo precio y descripción.' });
		// The JSON body drops these: an omitted column keeps the stored value.
		expect(body.slug).toBeUndefined();
		expect(body.note).toBeUndefined();
	});

	it('maps an integer price to a number without losing precision', () => {
		expect(advertisingPlanFormToBody({ ...VALID_FORM, price: '120' }).price).toBe(120);
		expect(advertisingPlanFormToBody({ ...VALID_FORM, price: '0' }).price).toBe(0);
	});
});

describe('publicPlanRows', () => {
	it('lists the filled public columns in landing order with their labels', () => {
		expect(
			publicPlanRows({
				id: 3,
				price: 120,
				description: 'Slot del pie de página.',
				slug: 'pie',
				name: null,
				visibility: 'discreto',
				moment: undefined,
				format: 'estático',
				cadence: null,
				note: 'Una línea de nota.',
			}),
		).toEqual([
			{ label: 'SLUG', value: 'pie' },
			{ label: 'VISIBILIDAD', value: 'discreto' },
			{ label: 'FORMATO', value: 'estático' },
			{ label: 'NOTA', value: 'Una línea de nota.' },
		]);
	});

	it('is empty when the plan has no public face', () => {
		expect(
			publicPlanRows({ id: 4, price: 60, description: 'Sin cara pública.', slug: null }),
		).toEqual([]);
	});

	it('covers every public field the disclosure renders, in order', () => {
		expect(PUBLIC_PLAN_FIELDS.map((field) => field.label)).toEqual([
			'SLUG',
			'NOMBRE',
			'VISIBILIDAD',
			'MOMENTO',
			'FORMATO',
			'CADENCIA',
			'NOTA',
		]);
	});
});
