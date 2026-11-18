import { describe, expect, it } from 'vitest';

import { parseTocChunk } from './toc';

describe('toc helpers', () => {
	it('parses a legacy inline TOC paragraph into heading and individual rows', () => {
		const raw =
			'Índice Nota de la traducción . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1 ' +
			'Presentación . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 1 ' +
			'La programación como construcción de teorías . . . . . . . . . . . . . . . . . . . . . . 2 ' +
			'Conclusiones . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 13';

		const parsed = parseTocChunk(raw);
		expect(parsed).not.toBeNull();
		expect(parsed?.heading).toBe('Índice');
		expect(parsed?.entries).toEqual([
			{ label: 'Nota de la traducción', page: 1 },
			{ label: 'Presentación', page: 1 },
			{ label: 'La programación como construcción de teorías', page: 2 },
			{ label: 'Conclusiones', page: 13 },
		]);
	});

	it('parses a multiline TOC chunk with tight dots and short-leader long titles', () => {
		const raw = [
			'Índice',
			'Prólogo..... 1',
			'La programación como construcción de teorías . 2',
			'Capítulo primero........... 4',
			'Epílogo . . 12',
		].join('\n');

		const parsed = parseTocChunk(raw);
		expect(parsed).toEqual({
			heading: 'Índice',
			entries: [
				{ label: 'Prólogo', page: 1 },
				{ label: 'La programación como construcción de teorías', page: 2 },
				{ label: 'Capítulo primero', page: 4 },
				{ label: 'Epílogo', page: 12 },
			],
		});
	});

	it('does not misclassify ordinary prose containing an ellipsis as TOC', () => {
		const prose =
			'Algo parecía moverse allá afuera... y el sargento dijo que en marzo llegarían los relevos (1985).';
		expect(parseTocChunk(prose)).toBeNull();
	});

	it('scans long narrative paragraphs with ellipses in linear time without backtracking', () => {
		const longProse =
			`${'La fortaleza permanecía en silencio bajo la niebla de la tarde, con las ventanas cerradas. '.repeat(30)}` +
			'Y entonces... miró hacia el desierto........................................ sin ver nada.';
		const t0 = performance.now();
		for (let i = 0; i < 300; i++) {
			expect(parseTocChunk(longProse)).toBeNull();
		}
		expect(performance.now() - t0).toBeLessThan(100);
	});

	it('parses non-dotted TOCs (tabs, multi-space, single-space after heading, dashes, Roman numerals)', () => {
		const tabAndSpaces = [
			'Tabla de contenidos',
			'Prefacio\tiv',
			'Capítulo 1. Fundamentos    12',
			'Capítulo 2. Arquitectura --- 35',
			'Epílogo ··· 118',
		].join('\n');

		expect(parseTocChunk(tabAndSpaces)).toEqual({
			heading: 'Tabla de contenidos',
			entries: [
				{ label: 'Prefacio', page: 4, pageLabel: 'iv' },
				{ label: 'Capítulo 1. Fundamentos', page: 12 },
				{ label: 'Capítulo 2. Arquitectura', page: 35 },
				{ label: 'Epílogo', page: 118 },
			],
		});

		const singleSpaceToc = [
			'Contenido',
			'Prólogo 5',
			'La ciudad de los inmortales 11',
			'Notas finales 89',
		].join('\n');

		expect(parseTocChunk(singleSpaceToc)).toEqual({
			heading: 'Contenido',
			entries: [
				{ label: 'Prólogo', page: 5 },
				{ label: 'La ciudad de los inmortales', page: 11 },
				{ label: 'Notas finales', page: 89 },
			],
		});
	});

	it('does not misclassify numbered prose lists or years as non-dotted TOCs', () => {
		const prose = [
			'En aquel año pasaron varias cosas:',
			'Los hechos de 1984',
			'Las reformas de 1992',
		].join('\n');
		expect(parseTocChunk(prose)).toBeNull();

		const numberedList = [
			'1. Introducción al tema',
			'2. Desarrollo de la idea',
		].join('\n');
		expect(parseTocChunk(numberedList)).toBeNull();
	});

	it('handles wrapped two-line TOC titles, page-first TOC rows, and inline TOCs marked type=toc', () => {
		const wrapped = [
			'Índice',
			'La estructura de las revoluciones',
			'científicas y su legado . . . . . . 42',
			'Capítulo separado',
			'77',
			'Conclusiones . . . . . . 108',
		].join('\n');

		expect(parseTocChunk(wrapped)).toEqual({
			heading: 'Índice',
			entries: [
				{ label: 'La estructura de las revoluciones científicas y su legado', page: 42 },
				{ label: 'Capítulo separado', page: 77 },
				{ label: 'Conclusiones', page: 108 },
			],
		});

		const pageFirst = [
			'Sumario',
			'12  Capítulo primero',
			'45  Capítulo segundo',
		].join('\n');

		expect(parseTocChunk(pageFirst)).toEqual({
			heading: 'Sumario',
			entries: [
				{ label: 'Capítulo primero', page: 12 },
				{ label: 'Capítulo segundo', page: 45 },
			],
		});

		const typedInline = 'Nota de la traducción 1 Presentación 2 Conclusiones 13';
		expect(parseTocChunk(typedInline, { chunkType: 'toc' })).toEqual({
			heading: undefined,
			entries: [
				{ label: 'Nota de la traducción', page: 1 },
				{ label: 'Presentación', page: 2 },
				{ label: 'Conclusiones', page: 13 },
			],
		});
	});

	it('assigns hierarchical TOC entry levels from numbered section labels without mutating labels', () => {
		const raw = [
			'Contenido',
			'1 Introducción 1',
			'1.1 Antecedentes 3',
			'1.1.1 Detalle de la implementación 5',
		].join('\n');

		const parsed = parseTocChunk(raw, { chunkType: 'toc' });
		expect(parsed?.heading).toBe('Contenido');
		expect(parsed?.entries).toEqual([
			{ label: '1 Introducción', page: 1 },
			{ label: '1.1 Antecedentes', page: 3, level: 2 },
			{ label: '1.1.1 Detalle de la implementación', page: 5, level: 3 },
		]);
		expect(parsed?.entries.map((entry) => entry.level ?? 1)).toEqual([1, 2, 3]);
	});
});
