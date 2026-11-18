import { describe, expect, it } from 'vitest';

import type { AdminServiceRow } from './api/services-admin';
import {
	EMPTY_SERVICE_FORM,
	SERVICE_ICON_OPTIONS,
	serviceCountLabel,
	serviceFeaturesToLines,
	serviceFormToBody,
	servicePriceLabel,
	serviceToForm,
	validateServiceForm,
} from './serviceForm';
import type { ServiceFormState } from './serviceForm';

const ROW: AdminServiceRow = {
	id: 3,
	name: 'Asesoría de tesis',
	description: 'Acompañamiento de principio a fin.',
	features: ['Dos sesiones al mes', 'Revisión de capítulos'],
	price: 150,
	userId: 'user-1',
	icon: 'pen-line',
	priceLabel: null,
};

const VALID_FORM: ServiceFormState = {
	name: 'Asesoría de tesis',
	description: 'Acompañamiento de principio a fin.',
	features: 'Dos sesiones al mes\nRevisión de capítulos',
	price: '150',
	icon: 'pen-line',
	priceLabel: '',
};

describe('serviceToForm', () => {
	it('joins the stored features with one line each and renders the price as text', () => {
		expect(serviceToForm(ROW)).toEqual({
			name: 'Asesoría de tesis',
			description: 'Acompañamiento de principio a fin.',
			features: 'Dos sesiones al mes\nRevisión de capítulos',
			price: '150',
			icon: 'pen-line',
			priceLabel: '',
		});
	});

	it('defaults a missing icon and price label to blank strings', () => {
		expect(
			serviceToForm({ ...ROW, icon: null, priceLabel: null, features: [] }),
		).toEqual({
			name: 'Asesoría de tesis',
			description: 'Acompañamiento de principio a fin.',
			features: '',
			price: '150',
			icon: '',
			priceLabel: '',
		});

		expect(serviceToForm({ ...ROW, icon: undefined, priceLabel: undefined }).icon).toBe('');
	});

	it('keeps a stored price label and a decimal price', () => {
		const form = serviceToForm({ ...ROW, price: 99.5, priceLabel: 'desde USD 99' });

		expect(form.price).toBe('99.5');
		expect(form.priceLabel).toBe('desde USD 99');
	});
});

describe('serviceFeaturesToLines', () => {
	it('trims each line and drops the blank separators', () => {
		expect(serviceFeaturesToLines('  Uno  \n\n Dos \n   \nTres')).toEqual(['Uno', 'Dos', 'Tres']);
	});

	it('keeps the empty text as an empty list', () => {
		expect(serviceFeaturesToLines('')).toEqual([]);
		expect(serviceFeaturesToLines('   \n  \n')).toEqual([]);
	});

	it('keeps a single line untouched, including its inner spaces', () => {
		expect(serviceFeaturesToLines('Una sola prestación')).toEqual(['Una sola prestación']);
		expect(serviceFeaturesToLines('Dos por uno')).toEqual(['Dos por uno']);
	});
});

describe('validateServiceForm', () => {
	it('returns null for a valid form', () => {
		expect(validateServiceForm(VALID_FORM)).toBeNull();
	});

	it('requires a name', () => {
		expect(validateServiceForm({ ...VALID_FORM, name: '' })).toBe('El servicio necesita un nombre.');
		expect(validateServiceForm({ ...VALID_FORM, name: '   ' })).toBe('El servicio necesita un nombre.');
	});

	it('requires a description', () => {
		expect(validateServiceForm({ ...VALID_FORM, description: '' })).toBe(
			'El servicio necesita una descripción.',
		);
		expect(validateServiceForm({ ...VALID_FORM, description: '  ' })).toBe(
			'El servicio necesita una descripción.',
		);
	});

	it('requires a numeric price', () => {
		const message = 'El precio tiene que ser un número.';

		expect(validateServiceForm({ ...VALID_FORM, price: '' })).toBe(message);
		expect(validateServiceForm({ ...VALID_FORM, price: '   ' })).toBe(message);
		expect(validateServiceForm({ ...VALID_FORM, price: 'abc' })).toBe(message);
		expect(validateServiceForm({ ...VALID_FORM, price: '150 USD' })).toBe(message);
		expect(validateServiceForm({ ...VALID_FORM, price: '120,5' })).toBe(message);
		expect(validateServiceForm({ ...VALID_FORM, price: 'Infinity' })).toBe(message);
	});

	it('accepts integers, decimals, and surrounding blanks', () => {
		expect(validateServiceForm({ ...VALID_FORM, price: '150' })).toBeNull();
		expect(validateServiceForm({ ...VALID_FORM, price: '150.50' })).toBeNull();
		expect(validateServiceForm({ ...VALID_FORM, price: ' 150 ' })).toBeNull();
	});

	it('reports name, then description, then price', () => {
		expect(validateServiceForm(EMPTY_SERVICE_FORM)).toBe('El servicio necesita un nombre.');
		expect(validateServiceForm({ ...EMPTY_SERVICE_FORM, name: 'Algo' })).toBe(
			'El servicio necesita una descripción.',
		);
		expect(validateServiceForm({ ...EMPTY_SERVICE_FORM, name: 'Algo', description: 'Algo' })).toBe(
			'El precio tiene que ser un número.',
		);
	});

	it('never rejects the optional features, icon, or price label', () => {
		expect(validateServiceForm({ ...VALID_FORM, features: '', icon: '', priceLabel: '' })).toBeNull();
	});
});

describe('serviceFormToBody', () => {
	it('trims the text columns, parses the price, and splits the features', () => {
		expect(
			serviceFormToBody({
				...VALID_FORM,
				name: '  Asesoría de tesis  ',
				description: '  Acompañamiento de principio a fin.  ',
				features: ' Uno \n\n Dos ',
				price: ' 150 ',
				priceLabel: ' desde USD 150 ',
			}),
		).toEqual({
			name: 'Asesoría de tesis',
			description: 'Acompañamiento de principio a fin.',
			features: ['Uno', 'Dos'],
			price: 150,
			icon: 'pen-line',
			priceLabel: 'desde USD 150',
		});
	});

	it('sends null for an empty price label and for an empty icon', () => {
		const body = serviceFormToBody({ ...VALID_FORM, icon: '', priceLabel: '   ' });

		expect(body.icon).toBeNull();
		expect(body.priceLabel).toBeNull();
	});

	it('sends null for an icon key the card cannot render', () => {
		expect(serviceFormToBody({ ...VALID_FORM, icon: 'rocket' }).icon).toBeNull();
	});

	it('keeps every icon key of the catalogue', () => {
		for (const option of SERVICE_ICON_OPTIONS) {
			expect(serviceFormToBody({ ...VALID_FORM, icon: option.value }).icon).toBe(option.value);
		}
	});

	it('maps a decimal price to a number without losing precision', () => {
		expect(serviceFormToBody({ ...VALID_FORM, price: '99.5' }).price).toBe(99.5);
		expect(serviceFormToBody({ ...VALID_FORM, price: '0' }).price).toBe(0);
	});

	it('sends an empty feature list when the textarea is blank', () => {
		expect(serviceFormToBody({ ...VALID_FORM, features: ' \n ' }).features).toEqual([]);
	});
});

describe('SERVICE_ICON_OPTIONS', () => {
	it('lists the three icons of the portada card with their Spanish labels', () => {
		expect(SERVICE_ICON_OPTIONS).toEqual([
			{ value: 'pen-line', label: 'Lapicero' },
			{ value: 'handshake', label: 'Apretón de manos' },
			{ value: 'graduation-cap', label: 'Birrete' },
		]);
	});
});

describe('servicePriceLabel', () => {
	it('prefers the stored price label when the card has one', () => {
		expect(servicePriceLabel({ price: 150, priceLabel: 'desde USD 150' })).toBe('desde USD 150');
	});

	it('falls back to the numeric price with the USD prefix', () => {
		expect(servicePriceLabel({ price: 150, priceLabel: null })).toBe('USD 150');
		expect(servicePriceLabel({ price: 99.5, priceLabel: null })).toBe('USD 99.5');
	});
});

describe('serviceCountLabel', () => {
	it('uses the singular for exactly one service', () => {
		expect(serviceCountLabel(1)).toBe('servicio');
	});

	it('uses the plural for zero and many services', () => {
		expect(serviceCountLabel(0)).toBe('servicios');
		expect(serviceCountLabel(2)).toBe('servicios');
	});
});
