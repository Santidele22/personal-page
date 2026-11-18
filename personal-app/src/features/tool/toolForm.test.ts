import { describe, expect, it } from 'vitest';

import type { ToolRow } from './api/tools-admin';
import {
	EMPTY_TOOL_FORM,
	TOOL_SPONSORSHIP_OPTIONS,
	sponsorshipLabel,
	toolFormToBody,
	toolToForm,
	validateToolForm,
} from './toolForm';

describe('TOOL_SPONSORSHIP_OPTIONS', () => {
	it('keeps the Spanish labels the admin panel renders', () => {
		expect(TOOL_SPONSORSHIP_OPTIONS).toEqual([
			{ value: 'genuina', label: 'Por amor al arte' },
			{ value: 'patrocinada', label: 'Patrocinada' },
		]);
	});
});

describe('sponsorshipLabel', () => {
	it('maps known sponsorship keys to Spanish labels and falls back to raw string', () => {
		expect(sponsorshipLabel('genuina')).toBe('Por amor al arte');
		expect(sponsorshipLabel('patrocinada')).toBe('Patrocinada');
		expect(sponsorshipLabel('custom')).toBe('custom');
		expect(sponsorshipLabel('')).toBe('');
	});
});

describe('toolToForm', () => {
	it('maps a stored row into editable form state', () => {
		const row: ToolRow = {
			id: 5,
			name: 'Astro',
			what: 'El sitio entero, del markdown al HTML',
			sponsorship: 'patrocinada',
			url: 'https://astro.build',
		};

		expect(toolToForm(row)).toEqual({
			name: 'Astro',
			what: 'El sitio entero, del markdown al HTML',
			url: 'https://astro.build',
			sponsorship: 'patrocinada',
		});
	});

	it('normalizes a missing url to an empty string and a missing sponsorship to genuina', () => {
		const row = {
			id: 1,
			name: 'Vim',
			what: 'Editor',
			sponsorship: undefined as unknown as ToolRow['sponsorship'],
			url: null,
		} satisfies ToolRow;

		expect(toolToForm(row)).toEqual({
			name: 'Vim',
			what: 'Editor',
			url: '',
			sponsorship: 'genuina',
		});
	});
});

describe('toolFormToBody', () => {
	it('trims every text field and keeps the sponsorship key', () => {
		expect(
			toolFormToBody({
				name: '  Astro ',
				what: ' El sitio entero ',
				url: ' https://astro.build ',
				sponsorship: 'patrocinada',
			}),
		).toEqual({
			name: 'Astro',
			what: 'El sitio entero',
			url: 'https://astro.build',
			sponsorship: 'patrocinada',
		});
	});

	it('sends an empty url to clear the stored link', () => {
		expect(toolFormToBody({ ...EMPTY_TOOL_FORM, name: 'Vim' })).toEqual({
			name: 'Vim',
			what: '',
			url: '',
			sponsorship: 'genuina',
		});
	});
});

describe('validateToolForm', () => {
	const validForm = {
		name: 'Astro',
		what: 'El sitio entero, del markdown al HTML',
		url: 'https://astro.build',
		sponsorship: 'genuina' as const,
	};

	it('returns null for a valid form', () => {
		expect(validateToolForm(validForm)).toBeNull();
	});

	it('accepts an empty or blank url because the backend treats it as sin link', () => {
		expect(validateToolForm({ ...validForm, url: '' })).toBeNull();
		expect(validateToolForm({ ...validForm, url: '   ' })).toBeNull();
	});

	it('requires a name with the copy the create form already shows', () => {
		const message = 'El nombre no puede quedar vacío.';

		expect(validateToolForm(EMPTY_TOOL_FORM)).toBe(message);
		expect(validateToolForm({ ...validForm, name: '   ' })).toBe(message);
	});

	it('requires a full http(s) url when one is typed', () => {
		const message =
			'El link tiene que ser una URL completa (https://…), o vacío si todavía no hay página.';

		expect(validateToolForm({ ...validForm, url: 'astro.build' })).toBe(message);
		expect(validateToolForm({ ...validForm, url: 'ftp://astro.build' })).toBe(message);
		expect(validateToolForm({ ...validForm, url: 'https://astro.build con espacio' })).toBe(message);
	});

	it('reports the missing name before the invalid url', () => {
		expect(validateToolForm({ ...EMPTY_TOOL_FORM, url: 'astro.build' })).toBe(
			'El nombre no puede quedar vacío.',
		);
	});
});
