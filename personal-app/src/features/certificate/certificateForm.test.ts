import { describe, expect, it } from 'vitest';

import type { AdminCertificateRow } from './api/certificates-admin';
import {
	EMPTY_CERTIFICATE_FORM,
	certificateFormToBody,
	certificateToForm,
	validateCertificateForm,
} from './certificateForm';

describe('certificateToForm', () => {
	it('maps a stored row into editable form state', () => {
		const row: AdminCertificateRow = {
			id: 9,
			image: '/uploads/cert.png',
			title: 'Meta Front-End Developer',
			description: 'Especialización en React y arquitectura front-end.',
			issuerLink: 'https://coursera.org/verify/123',
			date: '2024-06-15',
		};

		expect(certificateToForm(row)).toEqual({
			title: 'Meta Front-End Developer',
			description: 'Especialización en React y arquitectura front-end.',
			issuerLink: 'https://coursera.org/verify/123',
			date: '2024-06-15',
		});
	});

	it('normalizes missing issuerLink and date to empty strings', () => {
		const row = {
			id: 2,
			image: null,
			title: 'AWS Cloud Practitioner',
			description: 'Fundamentos cloud.',
			issuerLink: undefined as unknown as string,
			date: undefined as unknown as string,
		} satisfies AdminCertificateRow;

		expect(certificateToForm(row)).toEqual({
			title: 'AWS Cloud Practitioner',
			description: 'Fundamentos cloud.',
			issuerLink: '',
			date: '',
		});
	});
});

describe('certificateFormToBody', () => {
	it('trims all fields and preserves empty issuerLink to clear the link', () => {
		expect(
			certificateFormToBody({
				title: '  Meta Front-End Developer  ',
				description: '  Curso completo.  ',
				issuerLink: '   ',
				date: ' 2024-06-15 ',
			}),
		).toEqual({
			title: 'Meta Front-End Developer',
			description: 'Curso completo.',
			issuerLink: '',
			date: '2024-06-15',
		});
	});
});

describe('validateCertificateForm', () => {
	const validForm = {
		title: 'Meta Front-End Developer',
		description: 'Especialización en desarrollo front-end.',
		issuerLink: '',
		date: '2024-06-15',
	};

	it('accepts a valid form with or without an http(s) issuerLink', () => {
		expect(validateCertificateForm(validForm)).toBeNull();
		expect(
			validateCertificateForm({
				...validForm,
				issuerLink: 'https://coursera.org',
			}),
		).toBeNull();
	});

	it('requires title, description, and YYYY-MM-DD date', () => {
		expect(validateCertificateForm(EMPTY_CERTIFICATE_FORM)).toBe(
			'El certificado necesita un título.',
		);
		expect(validateCertificateForm({ ...validForm, title: '   ' })).toBe(
			'El certificado necesita un título.',
		);
		expect(validateCertificateForm({ ...validForm, description: '  ' })).toBe(
			'El certificado necesita una descripción.',
		);
		expect(validateCertificateForm({ ...validForm, date: '' })).toBe(
			'El certificado necesita una fecha.',
		);
		expect(validateCertificateForm({ ...validForm, date: '15/06/2024' })).toBe(
			'El certificado necesita una fecha.',
		);
	});

	it('rejects malformed issuerLink URLs', () => {
		expect(validateCertificateForm({ ...validForm, issuerLink: 'coursera.org' })).toBe(
			'El link del lugar tiene que ser una URL completa (https://…), o vacío si todavía no hay enlace.',
		);
		expect(validateCertificateForm({ ...validForm, issuerLink: 'https://coursera.org/a b' })).toBe(
			'El link del lugar tiene que ser una URL completa (https://…), o vacío si todavía no hay enlace.',
		);
	});
});
