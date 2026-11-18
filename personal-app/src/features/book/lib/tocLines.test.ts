import { describe, expect, it } from 'vitest';

import type { ReadingChunk, ReadingChunkType } from '../../../entities/book/types';

import { prepareBookDisplayItems } from './displayItems';
import { parseTocChunk } from './toc';

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

describe('leaderless TOC line helpers', () => {
	it('splits leaderless multi-entry TOC blocks instead of gluing them into one row', () => {
		const expectedEntries = [
			{ label: '¿QUÉ ES UN SISTEMA OPERATIVO?', page: 3 },
			{ label: '1.1.1 El sistema operativo como una máquina extendida', page: 4, level: 3 },
			{ label: '1.1.2 El sistema operativo como administrador de recursos', page: 6, level: 3 },
		];

		const inline =
			'¿QUÉ ES UN SISTEMA OPERATIVO? 3 1.1.1 El sistema operativo como una máquina extendida 4 ' +
			'1.1.2 El sistema operativo como administrador de recursos 6';
		expect(parseTocChunk(inline, { chunkType: 'para', inTocContext: true })?.entries).toEqual(
			expectedEntries,
		);

		const wrapped = [
			'¿QUÉ ES UN SISTEMA OPERATIVO? 3 1.1.1 El sistema operativo como una máquina extendida 4',
			'1.1.2 El sistema operativo como administrador de recursos 6',
		].join('\n');
		expect(parseTocChunk(wrapped, { chunkType: 'para', inTocContext: true })?.entries).toEqual(
			expectedEntries,
		);

		// A dotted leader TOC keeps its leader-based parsing untouched.
		expect(parseTocChunk('Contenido\nPrólogo . . . 5\nEpílogo . . . 90')?.entries).toEqual([
			{ label: 'Prólogo', page: 5 },
			{ label: 'Epílogo', page: 90 },
		]);
	});

	it('rescues legacy numbered-section headings glued to leaderless TOC rows', () => {
		const prepared = prepareBookDisplayItems(
			[
				makeChunk({ id: 'p0012.0000', type: 'heading', page: 12, text: '1.1' }),
				makeChunk({
					id: 'p0012.0100',
					type: 'para',
					page: 12,
					text:
						'¿QUÉ ES UN SISTEMA OPERATIVO? 3 1.1.1 El sistema operativo como una máquina extendida 4 ' +
						'1.1.2 El sistema operativo como administrador de recursos 6',
				}),
				makeChunk({ id: 'p0012.0200', type: 'heading', page: 12, text: '1.2' }),
				makeChunk({
					id: 'p0012.0300',
					type: 'para',
					page: 12,
					text: 'CONCEPTOS DE SISTEMAS OPERATIVOS 7 1.2.1 Procesos 9',
				}),
				makeChunk({ id: 'p0013.0000', type: 'para', page: 13, text: 'Un párrafo real que no es índice.' }),
			],
			200,
		);

		expect(prepared.items).toHaveLength(2);
		expect(prepared.items[0]).toEqual({
			kind: 'toc',
			chunkId: 'p0012.0100',
			chunkIds: ['p0012.0100', 'p0012.0300'],
			page: 12,
			parsed: {
				heading: undefined,
				entries: [
					{ label: '1.1 ¿QUÉ ES UN SISTEMA OPERATIVO?', page: 3, level: 2 },
					{
						label: '1.1.1 El sistema operativo como una máquina extendida',
						page: 4,
						level: 3,
					},
					{
						label: '1.1.2 El sistema operativo como administrador de recursos',
						page: 6,
						level: 3,
					},
					{ label: '1.2 CONCEPTOS DE SISTEMAS OPERATIVOS', page: 7, level: 2 },
					{ label: '1.2.1 Procesos', page: 9, level: 3 },
				],
			},
		});
		expect(prepared.items[1]).toMatchObject({
			kind: 'para',
			page: 13,
			text: 'Un párrafo real que no es índice.',
		});
	});
});
