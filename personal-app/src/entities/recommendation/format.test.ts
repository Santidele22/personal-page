import { describe, expect, it } from 'vitest';

import { excerptQuote, initialsFromName } from './format';

describe('initialsFromName', () => {
	it('takes the initials of the first and last name, uppercased', () => {
		expect(initialsFromName('Carlos Fabian Lencina')).toBe('CL');
		expect(initialsFromName('ana paz')).toBe('AP');
	});

	it('returns a middle dot for an empty name', () => {
		expect(initialsFromName('   ')).toBe('·');
	});
});

describe('excerptQuote', () => {
	it('keeps the first two sentences of a long quote and adds an ellipsis', () => {
		const quote =
			'Tengo la oportunidad de trabajar con Santiago como Full Stack Developer Jr. dentro del área de tokenizaciones, en un entorno fintech/crypto de alta exigencia, y su evolución fue realmente destacable. Participó activamente en el desarrollo de soluciones vinculadas a emisión y gestión de activos tokenizados, integrando componentes frontend y backend con gran responsabilidad. Siempre recibí muy buenos reportes de los Tech Leads.';
		expect(excerptQuote(quote)).toBe(
			'Tengo la oportunidad de trabajar con Santiago como Full Stack Developer Jr. dentro del área de tokenizaciones, en un entorno fintech/crypto de alta exigencia, y su evolución fue realmente destacable. Participó activamente en el desarrollo de soluciones vinculadas a emisión y gestión de activos tokenizados, integrando componentes frontend y backend con gran responsabilidad. …',
		);
	});

	it('returns the quote untouched when it fits in two sentences', () => {
		expect(excerptQuote('Gran profesional. Muy recomendado.')).toBe('Gran profesional. Muy recomendado.');
		expect(excerptQuote('Una sola oración sin más')).toBe('Una sola oración sin más');
	});

	it('trims whitespace and handles empty input', () => {
		expect(excerptQuote('   ')).toBe('');
		expect(excerptQuote('')).toBe('');
	});
});
