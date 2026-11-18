import { describe, expect, it } from 'vitest';

import type { ReadingChunk, ReadingChunkType } from '../../../entities/book/types';

import { prepareBookDisplayItems } from './displayItems';
import { findKeywordJumpTargetIndex } from './navigation';

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

describe('display item helpers', () => {
	it('merges split TOC pages, standalone TOC headings, and single-entry TOC chunks into one unified TOC', () => {
		const chunks = [
			{ id: 'p0001.0000', type: 'heading' as const, page: 1, offset: 0, text: 'Índice', mood: 'espera' as const, cues: [] },
			{ id: 'p0001.0020', type: 'para' as const, page: 1, offset: 20, text: 'Nota de la traducción . . . . . 1 www.lectulandia.com - Página 1', mood: 'espera' as const, cues: [] },
			{ id: 'p0001.0080', type: 'para' as const, page: 1, offset: 80, text: 'Presentación . . . . . 1', mood: 'espera' as const, cues: [] },
			{ id: 'p0001.0900', type: 'para' as const, page: 1, offset: 900, text: '1', mood: 'espera' as const, cues: [] },
			{ id: 'p0002.0000', type: 'heading' as const, page: 2, offset: 0, text: 'Índice', mood: 'espera' as const, cues: [] },
			{ id: 'p0002.0020', type: 'toc' as const, page: 2, offset: 20, text: 'Conclusiones . . . . . 13\nAplicando teoría . . . . . 14', mood: 'espera' as const, cues: [] },
			{ id: 'p0003.0000', type: 'heading' as const, page: 3, offset: 0, text: 'Presentación', mood: 'espera' as const, cues: [] },
			{ id: 'p0003.0020', type: 'para' as const, page: 3, offset: 20, text: 'Primer párrafo real del texto.', mood: 'espera' as const, cues: [] },
		];

		const prepared = prepareBookDisplayItems(chunks, 20);
		expect(prepared.totalParas).toBe(1);
		expect(prepared.items).toHaveLength(3);
		expect(prepared.items[0]).toMatchObject({
			kind: 'toc',
			parsed: {
				heading: 'Índice',
				entries: [
					{ label: 'Nota de la traducción', page: 1 },
					{ label: 'Presentación', page: 1 },
					{ label: 'Conclusiones', page: 13 },
					{ label: 'Aplicando teoría', page: 14 },
				],
			},
		});
		expect(prepared.items[1]).toMatchObject({ kind: 'heading', text: 'Presentación' });
		expect(prepared.items[2]).toMatchObject({
			kind: 'para',
			text: 'Primer párrafo real del texto.',
			paraIndex: 0,
			isFirstPara: true,
		});
	});

	it('maps every extended chunk type to its editorial display item', () => {
		const chunks = [
			makeChunk({ id: 'p0002.0000', type: 'heading', page: 2, text: 'Capítulo 1', level: 1, align: 'center' }),
			makeChunk({ id: 'p0002.0100', type: 'heading', page: 2, text: '1.2 Los sistemas operativos', level: 2 }),
			makeChunk({ id: 'p0002.0200', type: 'heading', page: 2, text: '1.2.3 El núcleo', level: 3 }),
			makeChunk({
				id: 'p0002.0300',
				type: 'para',
				page: 2,
				text: 'Un párrafo con tipografía.',
				runs: [{ text: 'Un ' }, { text: 'párrafo', marks: ['b'] }, { text: ' con tipografía.' }],
			}),
			makeChunk({
				id: 'p0002.0400',
				type: 'quote',
				page: 2,
				text: 'La simplicidad es un requisito previo.',
				runs: [{ text: 'La simplicidad', marks: ['i'] }],
			}),
			makeChunk({ id: 'p0002.0500', type: 'list', page: 2, text: 'Procesos\nArchivos\nMemoria', ordered: false }),
			makeChunk({ id: 'p0002.0600', type: 'code', page: 2, text: 'int main(void) { return 0; }' }),
			makeChunk({ id: 'p0002.0700', type: 'caption', page: 2, text: 'Figura 1.1 Procesos e hilos' }),
			makeChunk({ id: 'p0002.0800', type: 'dedication', page: 2, text: 'Para Suzanne' }),
		];

		const prepared = prepareBookDisplayItems(chunks, 200);
		expect(prepared.totalParas).toBe(4);
		expect(prepared.items).toEqual([
			{ kind: 'heading', chunkId: 'p0002.0000', page: 2, text: 'Capítulo 1', level: 1, align: 'center' },
			{ kind: 'heading', chunkId: 'p0002.0100', page: 2, text: '1.2 Los sistemas operativos', level: 2 },
			{ kind: 'heading', chunkId: 'p0002.0200', page: 2, text: '1.2.3 El núcleo', level: 3 },
			{
				kind: 'para',
				chunkId: 'p0002.0300',
				page: 2,
				mood: 'espera',
				cues: [],
				text: 'Un párrafo con tipografía.',
				verse: false,
				paraIndex: 0,
				isFirstPara: true,
				runs: [{ text: 'Un ' }, { text: 'párrafo', marks: ['b'] }, { text: ' con tipografía.' }],
			},
			{
				kind: 'quote',
				chunkId: 'p0002.0400',
				page: 2,
				mood: 'espera',
				cues: [],
				text: 'La simplicidad es un requisito previo.',
				paraIndex: 1,
				runs: [{ text: 'La simplicidad', marks: ['i'] }],
			},
			{
				kind: 'list',
				chunkId: 'p0002.0500',
				page: 2,
				mood: 'espera',
				cues: [],
				ordered: false,
				items: ['Procesos', 'Archivos', 'Memoria'],
				paraIndex: 2,
			},
			{
				kind: 'code',
				chunkId: 'p0002.0600',
				page: 2,
				mood: 'espera',
				cues: [],
				text: 'int main(void) { return 0; }',
				paraIndex: 3,
			},
			{ kind: 'caption', chunkId: 'p0002.0700', page: 2, text: 'Figura 1.1 Procesos e hilos' },
			{ kind: 'dedication', chunkId: 'p0002.0800', page: 2, text: 'Para Suzanne' },
		]);

		// Keyword jumps read list items through the public search helper.
		expect(findKeywordJumpTargetIndex(prepared.items, 'Archivos')).toBe(5);
	});

	it('prefers pre-split list items and marks ordered lists', () => {
		const prepared = prepareBookDisplayItems(
			[
				makeChunk({
					id: 'p0030.0000',
					type: 'list',
					page: 30,
					text: '1. Planificar\n2. Ejecutar',
					ordered: true,
					items: ['Planificar', 'Ejecutar'],
				}),
			],
			200,
		);

		expect(prepared.items).toEqual([
			{
				kind: 'list',
				chunkId: 'p0030.0000',
				page: 30,
				mood: 'espera',
				cues: [],
				ordered: true,
				items: ['Planificar', 'Ejecutar'],
				paraIndex: 0,
			},
		]);
	});

	it('promotes legacy dedication blocks and keeps real chapter titles as headings', () => {
		const prepared = prepareBookDisplayItems(
			[
				makeChunk({
					id: 'p0007.0000',
					type: 'heading',
					page: 7,
					text: 'Para Suzanne, Barbara, Marc y Rebecca',
				}),
				makeChunk({
					id: 'p0008.0000',
					type: 'heading',
					page: 8,
					text: 'A la memoria de Ana y Julio',
				}),
				makeChunk({ id: 'p0009.0000', type: 'heading', page: 9, text: 'PREFACIO' }),
			],
			200,
		);

		expect(prepared.items[0]).toEqual({
			kind: 'dedication',
			chunkId: 'p0007.0000',
			page: 7,
			text: 'Para Suzanne, Barbara, Marc y Rebecca',
		});
		expect(prepared.items[1]).toEqual({
			kind: 'dedication',
			chunkId: 'p0008.0000',
			page: 8,
			text: 'A la memoria de Ana y Julio',
		});
		expect(prepared.items[2]).toEqual({
			kind: 'heading',
			chunkId: 'p0009.0000',
			page: 9,
			text: 'PREFACIO',
			level: 1,
		});
		// An unrelated paragraph starting with "Para" is not a dedication.
		const prose = prepareBookDisplayItems(
			[
				makeChunk({
					id: 'p0040.0000',
					type: 'heading',
					page: 40,
					text: 'Para una crítica de la economía política',
				}),
			],
			200,
		);
		expect(prose.items[0]).toMatchObject({ kind: 'heading' });
	});

	it('preserves leading indentation on the first line of code chunks while trimming blank outer lines', () => {
		const prepared = prepareBookDisplayItems(
			[
				makeChunk({
					id: 'p0050.0000',
					type: 'code',
					page: 50,
					text: '\n  int x = 1;\n    return x;\n\n',
				}),
			],
			100,
		);

		expect(prepared.items[0]).toMatchObject({
			kind: 'code',
			text: '  int x = 1;\n    return x;',
		});
	});
});
