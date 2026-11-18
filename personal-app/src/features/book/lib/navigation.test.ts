import { describe, expect, it } from 'vitest';

import type { ReadingChunk, ReadingChunkType } from '../../../entities/book/types';

import { prepareBookDisplayItems } from './displayItems';
import {
	computeInitialRenderWindow,
	extractBookChapters,
	findActiveChapterIndex,
	findAdjacentChapterIndex,
	findKeywordJumpTargetIndex,
	findSavedProgressItemIndex,
	findTocJumpTargetIndex,
} from './navigation';

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

describe('chapter navigation helpers', () => {
	it('computes bounded progressive render windows and resolves TOC / progress / keyword jumps across the full book', () => {
		const chunks = Array.from({ length: 300 }, (_, idx) => ({
			id: `p${String(idx + 1).padStart(4, '0')}.0000`,
			type: (idx === 0 || idx === 250 ? 'heading' : 'para') as 'heading' | 'para',
			page: idx + 1,
			offset: 0,
			text: idx === 0 ? 'Introducción' : idx === 250 ? 'Capítulo final' : `Párrafo ${idx + 1} del libro con contenido suficiente.`,
			mood: 'espera' as const,
			cues: [],
		}));

		const prepared = prepareBookDisplayItems(chunks, 300);
		expect(computeInitialRenderWindow(prepared.items.length, 0, 60)).toEqual({ start: 0, end: 60 });
		expect(computeInitialRenderWindow(prepared.items.length, 250, 60)).toEqual({ start: 220, end: 292 });

		expect(findSavedProgressItemIndex(prepared.items, { chunkId: 'p0251.0000', page: 251 })).toBe(250);
		expect(findSavedProgressItemIndex(prepared.items, { page: 180 })).toBe(179);

		// Short label "I" must NOT falsely match "Introducción"
		expect(findTocJumpTargetIndex(prepared.items, 'I', 251)).toBe(250);
		expect(findTocJumpTargetIndex(prepared.items, 'Capítulo final', 251)).toBe(250);
		expect(findKeywordJumpTargetIndex(prepared.items, 'Párrafo 200', 'p0200.0000')).toBe(199);
	});

	it('extracts level-1 headings and chapterMarker paragraphs while skipping deeper subsections', () => {
		const prepared = prepareBookDisplayItems(
			[
				makeChunk({ id: 'p0001.0000', type: 'heading', page: 1, level: 1, text: 'Prólogo' }),
				makeChunk({ id: 'p0002.0000', type: 'para', page: 2, text: 'Introducción breve.' }),
				makeChunk({ id: 'p0005.0000', type: 'heading', page: 5, level: 1, text: '1 · Procesos' }),
				makeChunk({ id: 'p0006.0000', type: 'heading', page: 6, level: 2, text: '1.1 Hilos' }),
				makeChunk({
					id: 'p0020.0000',
					type: 'para',
					page: 20,
					text: 'I En el gran edificio del Palacio de Justicia todo estaba en silencio.',
				}),
			],
			50,
		);

		expect(extractBookChapters(prepared.items)).toEqual([
			{ id: 'p0001.0000', itemIndex: 0, title: 'Prólogo', page: 1, level: 1 },
			{ id: 'p0005.0000', itemIndex: 2, title: '1 · Procesos', page: 5, level: 1 },
			{
				id: 'p0020.0000',
				itemIndex: 4,
				title: 'I · En el gran edificio del Palacio de Justicia…',
				page: 20,
				level: 1,
			},
		]);
	});

	it('falls back to shallowest heading level when a book has no level-1 headings', () => {
		const prepared = prepareBookDisplayItems(
			[
				makeChunk({ id: 'p0003.0000', type: 'heading', page: 3, level: 2, text: '1.1 Arranque' }),
				makeChunk({ id: 'p0004.0000', type: 'heading', page: 4, level: 3, text: '1.1.1 Detalle' }),
				makeChunk({ id: 'p0010.0000', type: 'heading', page: 10, level: 2, text: '1.2 Memoria' }),
			],
			30,
		);

		expect(extractBookChapters(prepared.items)).toEqual([
			{ id: 'p0003.0000', itemIndex: 0, title: '1.1 Arranque', page: 3, level: 2 },
			{ id: 'p0010.0000', itemIndex: 2, title: '1.2 Memoria', page: 10, level: 2 },
		]);
	});

	it('falls back to TOC entries when no heading or chapterMarker exists', () => {
		const prepared = prepareBookDisplayItems(
			[
				makeChunk({
					id: 'p0001.0000',
					type: 'toc',
					page: 1,
					text: 'Índice\nInicio . . . 2\nDesarrollo . . . 5',
				}),
				makeChunk({ id: 'p0002.0000', type: 'para', page: 2, text: 'Arranca la historia.' }),
				makeChunk({ id: 'p0005.0000', type: 'para', page: 5, text: 'Sigue el desarrollo.' }),
			],
			10,
		);

		expect(extractBookChapters(prepared.items)).toEqual([
			{ id: 'p0002.0000', itemIndex: 1, title: 'Inicio', page: 2, level: 1 },
			{ id: 'p0005.0000', itemIndex: 2, title: 'Desarrollo', page: 5, level: 1 },
		]);
	});

	it('computes active and adjacent chapter indices for forward and backward navigation', () => {
		const chapters = [
			{ id: 'c1', itemIndex: 2, title: 'Cap 1', page: 2, level: 1 as const },
			{ id: 'c2', itemIndex: 10, title: 'Cap 2', page: 8, level: 1 as const },
			{ id: 'c3', itemIndex: 25, title: 'Cap 3', page: 20, level: 1 as const },
		];

		expect(findActiveChapterIndex(chapters, 0)).toBe(-1);
		expect(findActiveChapterIndex(chapters, 10)).toBe(1);
		expect(findActiveChapterIndex(chapters, 18)).toBe(1);

		expect(findAdjacentChapterIndex(chapters, 0, 1)).toBe(0);
		expect(findAdjacentChapterIndex(chapters, 0, -1)).toBeNull();
		expect(findAdjacentChapterIndex(chapters, 10, 1)).toBe(2);
		expect(findAdjacentChapterIndex(chapters, 10, -1)).toBe(0);
		expect(findAdjacentChapterIndex(chapters, 5, -1)).toBe(0);
		expect(findAdjacentChapterIndex(chapters, 2, -1)).toBeNull();
		expect(findAdjacentChapterIndex(chapters, 25, 1)).toBeNull();
	});
});
