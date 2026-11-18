import { describe, expect, it } from 'vitest';

import { prepareChunkDisplay } from './displayModel';
import { collectRepeatedEdgeNoise } from './noise';

describe('noise helpers', () => {
	it('hides ebook site promos, URLs, domain page footers, and ePub ripper stamps', () => {
		const book = { title: 'Las intermitencias de la muerte', author: 'José Saramago' };

		expect(
			prepareChunkDisplay(
				{
					id: 'p0001.0000',
					type: 'para',
					page: 1,
					offset: 0,
					text: 'Libro proporcionado por el equipo Le Libros Visite nuestro sitio y descarga esto y otros miles de libros',
					mood: 'espera',
					cues: ['libros'],
				},
				book,
			),
		).toEqual({ kind: 'hidden' });

		expect(
			prepareChunkDisplay(
				{
					id: 'p0001.0120',
					type: 'para',
					page: 1,
					offset: 120,
					text: 'http://LeLibros.org/',
					mood: 'espera',
					cues: ['lelibros'],
				},
				book,
			),
		).toEqual({ kind: 'hidden' });

		expect(
			prepareChunkDisplay(
				{
					id: 'p0004.0900',
					type: 'para',
					page: 4,
					offset: 900,
					text: 'www.lectulandia.com - Página 4',
					mood: 'espera',
					cues: ['pagina'],
				},
				book,
			),
		).toEqual({ kind: 'hidden' });

		expect(
			prepareChunkDisplay(
				{
					id: 'p0003.0000',
					type: 'para',
					page: 3,
					offset: 0,
					text: 'Las intermitencias de la muerte ePub r1.4 Andaluso 08.02.18',
					mood: 'alerta',
					cues: ['muerte'],
				},
				book,
			),
		).toEqual({ kind: 'hidden' });

		expect(
			prepareChunkDisplay(
				{
					id: 'p0003.0100',
					type: 'para',
					page: 3,
					offset: 100,
					text: 'Andaluso 08.02.18',
					mood: 'espera',
					cues: ['andaluso'],
				},
				book,
				{ totalPages: 180 },
			),
		).toEqual({ kind: 'hidden' });

		expect(
			prepareChunkDisplay(
				{
					id: 'p0003.0900',
					type: 'para',
					page: 3,
					offset: 900,
					text: 'ebookelo.com - Página 3',
					mood: 'espera',
					cues: ['pagina'],
				},
				book,
			),
		).toEqual({ kind: 'hidden' });
	});

	it('detects and hides cross-page repeated running headers and footers while preserving chapters', () => {
		const chunks = [
			{ id: 'p0001.0000', type: 'heading' as const, page: 1, offset: 0, text: 'Capítulo 1', mood: 'espera' as const, cues: [] },
			{ id: 'p0001.0020', type: 'para' as const, page: 1, offset: 20, text: 'Primer párrafo real del libro.', mood: 'espera' as const, cues: [] },
			{ id: 'p0002.0000', type: 'heading' as const, page: 2, offset: 0, text: 'JOSÉ SARAMAGO', mood: 'espera' as const, cues: [] },
			{ id: 'p0002.0020', type: 'para' as const, page: 2, offset: 20, text: 'Segundo párrafo real del libro.', mood: 'espera' as const, cues: [] },
			{ id: 'p0002.0900', type: 'para' as const, page: 2, offset: 900, text: 'Página 2 · Las intermitencias', mood: 'espera' as const, cues: [] },
			{ id: 'p0003.0000', type: 'heading' as const, page: 3, offset: 0, text: 'JOSÉ SARAMAGO', mood: 'espera' as const, cues: [] },
			{ id: 'p0003.0020', type: 'para' as const, page: 3, offset: 20, text: 'Tercer párrafo real del libro.', mood: 'espera' as const, cues: [] },
			{ id: 'p0003.0900', type: 'para' as const, page: 3, offset: 900, text: 'Página 3 · Las intermitencias', mood: 'espera' as const, cues: [] },
			{ id: 'p0004.0000', type: 'heading' as const, page: 4, offset: 0, text: 'JOSÉ SARAMAGO', mood: 'espera' as const, cues: [] },
			{ id: 'p0004.0020', type: 'para' as const, page: 4, offset: 20, text: 'Cuarto párrafo real del libro.', mood: 'espera' as const, cues: [] },
			{ id: 'p0004.0900', type: 'para' as const, page: 4, offset: 900, text: 'Página 4 · Las intermitencias', mood: 'espera' as const, cues: [] },
		];

		const repeatedNoiseKeys = collectRepeatedEdgeNoise(chunks, 120);
		expect(prepareChunkDisplay(chunks[0], null, { repeatedNoiseKeys, totalPages: 120 })).toEqual({
			kind: 'heading',
			text: 'Capítulo 1',
		});
		expect(prepareChunkDisplay(chunks[2], null, { repeatedNoiseKeys, totalPages: 120 })).toEqual({
			kind: 'hidden',
		});
		expect(prepareChunkDisplay(chunks[4], null, { repeatedNoiseKeys, totalPages: 120 })).toEqual({
			kind: 'hidden',
		});
		expect(prepareChunkDisplay(chunks[3], null, { repeatedNoiseKeys, totalPages: 120 })).toEqual({
			kind: 'para',
			text: 'Segundo párrafo real del libro.',
			verse: false,
		});
	});
});
