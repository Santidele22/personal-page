import { describe, expect, it } from 'vitest';

import type { ReadingChunk, ReadingChunkType } from '../../../entities/book/types';

import { prepareBookDisplayItems } from './displayItems';
import { prepareChunkDisplay } from './displayModel';
import {
	extractLeadingChapterMarker,
	isLikelyFalseHeading,
	parseBookOpenerHeading,
} from './headings';

function makeChunk(
	partial: Pick<ReadingChunk, 'id' | 'page' | 'text'> & {
		type: ReadingChunkType;
		level?: 1 | 2 | 3;
		runs?: ReadingChunk['runs'];
		ordered?: boolean;
		items?: string[];
		align?: 'left' | 'center' | 'right';
	},
): ReadingChunk {
	return { offset: 0, mood: 'espera', cues: [], ...partial };
}

describe('heading helpers', () => {
	it('splits glued author + title headings into a structured book opener', () => {
		const opener = parseBookOpenerHeading(
			'Lev Nikoláievich Tolstói La muerte de Iván Ilich',
			{
				title: 'La muerte de Iván Ilich',
				author: 'Lev Nikoláievich Tolstói',
			},
		);
		expect(opener).toEqual({
			author: 'Lev Nikoláievich Tolstói',
			title: 'La muerte de Iván Ilich',
		});
		const openerWithMiddleName = parseBookOpenerHeading(
			'Lev Nikoláievich Tolstói La muerte de Iván Ilich',
			{
				title: 'La muerte de Iván Ilich',
				author: 'Lev Tolstói',
			},
		);
		expect(openerWithMiddleName).toEqual({
			author: 'Lev Nikoláievich Tolstói',
			title: 'La muerte de Iván Ilich',
		});
		expect(
			parseBookOpenerHeading('Capítulo primero', {
				title: 'La muerte de Iván Ilich',
				author: 'Lev Nikoláievich Tolstói',
			}),
		).toBeNull();
	});

	it('demotes sentence continuations and dialogue fragments misclassified as headings', () => {
		expect(isLikelyFalseHeading('Ivánovich en voz alta—. Qué pena.')).toBe(true);
		expect(isLikelyFalseHeading('y entonces salió al corredor.')).toBe(true);
		expect(isLikelyFalseHeading('Capítulo IV')).toBe(false);
		expect(isLikelyFalseHeading('La espera')).toBe(false);

		const demoted = prepareChunkDisplay(
			{
				id: 'p0007.0000',
				type: 'heading',
				page: 7,
				offset: 0,
				text: 'Ivánovich en voz alta—. Qué pena.',
				mood: 'alerta',
				cues: ['ivánovich'],
			},
			{ title: 'La muerte de Iván Ilich', author: 'Lev Tolstói' },
		);
		expect(demoted).toEqual({
			kind: 'para',
			text: 'Ivánovich en voz alta—. Qué pena.',
			verse: false,
		});
	});

	it('extracts leading Roman or chapter markers without breaking English pronoun "I"', () => {
		expect(
			extractLeadingChapterMarker(
				'I En el gran edificio del Palacio de Justicia, acaecido el 4 de febrero de 1882.',
			),
		).toEqual({
			marker: 'I',
			rest: 'En el gran edificio del Palacio de Justicia, acaecido el 4 de febrero de 1882.',
		});

		expect(
			extractLeadingChapterMarker('Capítulo IV. La tarde cayó sobre la fortaleza.'),
		).toEqual({
			marker: 'Capítulo IV',
			rest: 'La tarde cayó sobre la fortaleza.',
		});

		expect(
			extractLeadingChapterMarker('I was walking down the road when the rain began.'),
		).toBeNull();

		const prepared = prepareChunkDisplay({
			id: 'p0006.0000',
			type: 'para',
			page: 6,
			offset: 0,
			text: 'II Iván Ilich era funcionario desde hacía diecisiete años en aquel ministerio.',
			mood: 'espera',
			cues: ['años'],
		});
		expect(prepared).toEqual({
			kind: 'para',
			text: 'Iván Ilich era funcionario desde hacía diecisiete años en aquel ministerio.',
			verse: false,
			chapterMarker: 'II',
		});
	});

	it('infers heading levels for legacy headings that omit chunk.level', () => {
		const prepared = prepareBookDisplayItems(
			[
				makeChunk({ id: 'p0020.0000', type: 'heading', page: 20, text: 'Capítulo 1. Introducción' }),
				makeChunk({ id: 'p0020.0100', type: 'heading', page: 20, text: '1.1 Antecedentes históricos' }),
				makeChunk({ id: 'p0020.0200', type: 'heading', page: 20, text: '1.1.1 Primeros sistemas' }),
			],
			200,
		);

		expect(prepared.items.map((item) => (item.kind === 'heading' ? item.level : null))).toEqual([
			1, 2, 3,
		]);
		// Legacy v1 headings must not be rewritten while gaining a level.
		expect(prepared.items[1]).toEqual({
			kind: 'heading',
			chunkId: 'p0020.0100',
			page: 20,
			text: '1.1 Antecedentes históricos',
			level: 2,
		});
	});

	it('demotes legacy edition, print-run and credits headings to grouped metadata', () => {
		const prepared = prepareBookDisplayItems(
			[
				makeChunk({ id: 'p0004.0000', type: 'heading', page: 4, text: '09 10 11 12' }),
				makeChunk({ id: 'p0004.0100', type: 'heading', page: 4, text: '3ª edición' }),
				makeChunk({ id: 'p0004.0200', type: 'heading', page: 4, text: 'TERCERA EDICIÓN' }),
				makeChunk({ id: 'p0004.0300', type: 'heading', page: 4, text: 'TRADUCCIÓN' }),
				makeChunk({ id: 'p0004.0400', type: 'heading', page: 4, text: 'REVISIÓN TÉCNICA' }),
				makeChunk({
					id: 'p0004.0500',
					type: 'heading',
					page: 4,
					text: 'Para mayor información visite la página Web:',
				}),
				makeChunk({
					id: 'p0005.0000',
					type: 'heading',
					page: 5,
					text: 'ANDREW S. TANENBAUM Vrije Universiteit Amsterdam, Holanda',
				}),
				makeChunk({ id: 'p0020.0000', type: 'para', page: 20, text: 'Primer párrafo real del libro.' }),
			],
			200,
		);

		expect(prepared.items).toHaveLength(3);
		expect(prepared.items[0]).toEqual({
			kind: 'meta',
			chunkId: 'p0004.0000',
			page: 4,
			text: [
				'09 10 11 12',
				'3ª edición',
				'TERCERA EDICIÓN',
				'TRADUCCIÓN',
				'REVISIÓN TÉCNICA',
				'Para mayor información visite la página Web:',
			].join('\n'),
		});
		expect(prepared.items[1]).toEqual({
			kind: 'meta',
			chunkId: 'p0005.0000',
			page: 5,
			text: 'ANDREW S. TANENBAUM Vrije Universiteit Amsterdam, Holanda',
		});
		expect(prepared.items[2]).toMatchObject({ kind: 'para', text: 'Primer párrafo real del libro.' });
	});
});
