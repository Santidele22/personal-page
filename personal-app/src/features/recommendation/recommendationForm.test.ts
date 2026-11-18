import { describe, expect, it } from 'vitest';

import type { AdminRecommendationRow } from './api/recommendations-admin';
import {
	EMPTY_RECOMMENDATION_FORM,
	recommendationFormToBody,
	recommendationToForm,
	validateRecommendationForm,
} from './recommendationForm';

describe('recommendationToForm', () => {
	it('maps a stored row into editable strings', () => {
		const row: AdminRecommendationRow = {
			id: 7,
			quote: 'Excelente criterio técnico.',
			authorName: 'Carlos Lencina',
			authorRole: 'CTO',
			relationship: 'Me supervisó directamente',
			linkedinUrl: 'https://www.linkedin.com/in/carlos',
			position: 2,
		};

		expect(recommendationToForm(row)).toEqual({
			quote: 'Excelente criterio técnico.',
			authorName: 'Carlos Lencina',
			authorRole: 'CTO',
			relationship: 'Me supervisó directamente',
			linkedinUrl: 'https://www.linkedin.com/in/carlos',
			position: '2',
		});
	});

	it('normalizes missing linkedinUrl to an empty string', () => {
		const row = {
			id: 1,
			quote: 'Cita',
			authorName: 'Ana',
			authorRole: 'Lead',
			relationship: 'Colega',
			linkedinUrl: undefined as unknown as string,
			position: 0,
		};

		expect(recommendationToForm(row).linkedinUrl).toBe('');
		expect(recommendationToForm(row).position).toBe('0');
	});
});

describe('recommendationFormToBody', () => {
	it('trims fields and includes zero or positive position', () => {
		expect(
			recommendationFormToBody({
				quote: '  Muy buen trabajo.  ',
				authorName: ' Ana Paz ',
				authorRole: ' Staff Engineer ',
				relationship: ' Trabajamos juntos ',
				linkedinUrl: ' https://linkedin.com/in/ana ',
				position: ' 0 ',
			}),
		).toEqual({
			quote: 'Muy buen trabajo.',
			authorName: 'Ana Paz',
			authorRole: 'Staff Engineer',
			relationship: 'Trabajamos juntos',
			linkedinUrl: 'https://linkedin.com/in/ana',
			position: 0,
		});
	});

	it('preserves empty linkedinUrl to clear the link and omits blank or invalid position', () => {
		const body = recommendationFormToBody({
			quote: 'Cita',
			authorName: 'Ana',
			authorRole: 'Dev',
			relationship: 'Colega',
			linkedinUrl: '   ',
			position: '   ',
		});

		expect(body).toEqual({
			quote: 'Cita',
			authorName: 'Ana',
			authorRole: 'Dev',
			relationship: 'Colega',
			linkedinUrl: '',
		});
		expect('position' in body).toBe(false);
	});
});

describe('validateRecommendationForm', () => {
	const validForm = {
		quote: 'Gran impacto en el equipo.',
		authorName: 'Carlos Lencina',
		authorRole: 'CTO',
		relationship: 'Me supervisó directamente',
		linkedinUrl: '',
		position: '',
	};

	it('accepts a valid form with empty optional fields', () => {
		expect(validateRecommendationForm(validForm)).toBeNull();
	});

	it('accepts a valid http(s) linkedinUrl and non-negative integer position', () => {
		expect(
			validateRecommendationForm({
				...validForm,
				linkedinUrl: 'https://www.linkedin.com/in/carlos',
				position: '0',
			}),
		).toBeNull();
	});

	it('requires quote, authorName, authorRole, and relationship', () => {
		expect(validateRecommendationForm(EMPTY_RECOMMENDATION_FORM)).toBe(
			'La recomendación necesita el texto de la cita.',
		);
		expect(validateRecommendationForm({ ...validForm, quote: '   ' })).toBe(
			'La recomendación necesita el texto de la cita.',
		);
		expect(validateRecommendationForm({ ...validForm, authorName: '' })).toBe(
			'La recomendación necesita el nombre de quien la firma.',
		);
		expect(validateRecommendationForm({ ...validForm, authorRole: '' })).toBe(
			'La recomendación necesita el rol de quien la firma.',
		);
		expect(validateRecommendationForm({ ...validForm, relationship: '' })).toBe(
			'La recomendación necesita la relación (por ejemplo, «Me supervisó directamente»).',
		);
	});

	it('rejects malformed linkedin URLs', () => {
		expect(validateRecommendationForm({ ...validForm, linkedinUrl: 'linkedin.com/in/test' })).toBe(
			'El link de LinkedIn tiene que ser una URL completa (https://…), o vacío si todavía no hay enlace.',
		);
	});

	it('rejects negative, fractional, or non-numeric positions', () => {
		expect(validateRecommendationForm({ ...validForm, position: '-1' })).toBe(
			'La posición tiene que ser un número entero igual o mayor que cero.',
		);
		expect(validateRecommendationForm({ ...validForm, position: '1.5' })).toBe(
			'La posición tiene que ser un número entero igual o mayor que cero.',
		);
		expect(validateRecommendationForm({ ...validForm, position: 'abc' })).toBe(
			'La posición tiene que ser un número entero igual o mayor que cero.',
		);
	});
});
