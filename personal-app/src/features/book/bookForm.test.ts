import { describe, expect, it } from 'vitest';

import type { AdminBookRow } from './api/books-admin';
import {
	EMPTY_BOOK_FORM,
	bookFormToBody,
	bookKindLabel,
	bookStatusLabel,
	bookToForm,
	formatBookFileSize,
	validateBookForm,
} from './bookForm';

describe('bookStatusLabel', () => {
	it('maps known status keys to Spanish labels and falls back to raw string', () => {
		expect(bookStatusLabel('reading')).toBe('Leyendo');
		expect(bookStatusLabel('finished')).toBe('Terminado');
		expect(bookStatusLabel('queued')).toBe('En cola');
		expect(bookStatusLabel('custom')).toBe('custom');
	});
});

describe('bookKindLabel', () => {
	it('maps known kind keys and defaults missing or unknown kinds to No técnico', () => {
		expect(bookKindLabel('tecnico')).toBe('Técnico');
		expect(bookKindLabel('no_tecnico')).toBe('No técnico');
		expect(bookKindLabel(null)).toBe('No técnico');
		expect(bookKindLabel(undefined)).toBe('No técnico');
		expect(bookKindLabel('unknown')).toBe('No técnico');
	});
});

describe('bookToForm', () => {
	it('maps a stored row into editable form state', () => {
		const row: AdminBookRow = {
			id: 12,
			title: 'Designing Data-Intensive Applications',
			author: 'Martin Kleppmann',
			description: 'Arquitectura de sistemas distribuidos.',
			status: 'finished',
			kind: 'tecnico',
			review: 'Imprescindible.',
			published: true,
			ownerId: 'user-1',
		};

		expect(bookToForm(row)).toEqual({
			title: 'Designing Data-Intensive Applications',
			author: 'Martin Kleppmann',
			description: 'Arquitectura de sistemas distribuidos.',
			status: 'finished',
			kind: 'tecnico',
			review: 'Imprescindible.',
			published: true,
		});
	});

	it('applies defaults for nullable status, kind, review, and published', () => {
		const row = {
			id: 1,
			title: 'El Aleph',
			author: 'Jorge Luis Borges',
			description: 'Cuentos.',
			status: undefined as unknown as AdminBookRow['status'],
			kind: null,
			review: null,
			published: null,
			ownerId: 'user-1',
		} satisfies AdminBookRow;

		expect(bookToForm(row)).toEqual({
			title: 'El Aleph',
			author: 'Jorge Luis Borges',
			description: 'Cuentos.',
			status: 'reading',
			kind: 'no_tecnico',
			review: '',
			published: false,
		});
	});
});

describe('bookFormToBody', () => {
	it('trims text fields and converts blank review to null', () => {
		expect(
			bookFormToBody({
				title: '  Ficciones  ',
				author: '  Borges ',
				description: ' Relatos breves. ',
				status: 'queued',
				kind: 'no_tecnico',
				review: '   ',
				published: true,
			}),
		).toEqual({
			title: 'Ficciones',
			author: 'Borges',
			description: 'Relatos breves.',
			status: 'queued',
			kind: 'no_tecnico',
			review: null,
			published: true,
		});
	});

	it('falls back to valid enum defaults if status or kind is invalid', () => {
		expect(
			bookFormToBody({
				title: 'Libro',
				author: 'Autor',
				description: 'Desc',
				status: 'invalid',
				kind: 'invalid',
				review: '  Muy bueno  ',
				published: false,
			}),
		).toEqual({
			title: 'Libro',
			author: 'Autor',
			description: 'Desc',
			status: 'reading',
			kind: 'no_tecnico',
			review: 'Muy bueno',
			published: false,
		});
	});
});

describe('validateBookForm', () => {
	const validForm = {
		title: 'Clean Architecture',
		author: 'Robert C. Martin',
		description: 'Principios de diseño de software.',
		status: 'reading',
		kind: 'tecnico',
		review: '',
		published: false,
	};

	it('returns null for a valid form', () => {
		expect(validateBookForm(validForm)).toBeNull();
	});

	it('requires title, author, and description', () => {
		expect(validateBookForm(EMPTY_BOOK_FORM)).toBe('El libro necesita un título.');
		expect(validateBookForm({ ...validForm, title: '   ' })).toBe('El libro necesita un título.');
		expect(validateBookForm({ ...validForm, author: '   ' })).toBe('El libro necesita un autor.');
		expect(validateBookForm({ ...validForm, description: '' })).toBe(
			'El libro necesita una descripción.',
		);
	});
});

describe('formatBookFileSize', () => {
	it('returns null for empty, invalid, or non-positive sizes', () => {
		expect(formatBookFileSize(null)).toBeNull();
		expect(formatBookFileSize(undefined)).toBeNull();
		expect(formatBookFileSize('')).toBeNull();
		expect(formatBookFileSize('0')).toBeNull();
		expect(formatBookFileSize('-5')).toBeNull();
		expect(formatBookFileSize('abc')).toBeNull();
	});

	it('formats bytes into readable B, KB, MB, and GB labels', () => {
		expect(formatBookFileSize('512')).toBe('512 B');
		expect(formatBookFileSize('1536')).toBe('1.5 KB');
		expect(formatBookFileSize('10240')).toBe('10 KB');
		expect(formatBookFileSize(String(5 * 1024 * 1024))).toBe('5.0 MB');
		expect(formatBookFileSize(String(2 * 1024 * 1024 * 1024))).toBe('2.0 GB');
	});
});
