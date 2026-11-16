import { describe, expect, it } from 'vitest';
import {
	clusterVisualLineTops,
	collectRepeatedEdgeNoise,
	computeDampedWheelDelta,
	computeFovealBandMetrics,
	DEFAULT_READER_PREFS,
	extractLeadingChapterMarker,
	findAdjacentLineTop,
	isLikelyFalseHeading,
	parseBookOpenerHeading,
	parseReaderPrefs,
	parseTocChunk,
	prepareChunkDisplay,
	removeMarkFromState,
	removeWordFromState,
	resolvePreferredReadingState,
	stepReaderScale,
} from './reader';

describe('reader helpers', () => {
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

	it('removes an underline mark by id or fallback anchor/text', () => {
		const marks = [
			{ id: 'm-1', kind: 'underline' as const, ink: 'aka' as const, anchor: 'p0001.0000+[0,13]', text: 'modificaciones' },
			{ id: 'm-2', kind: 'underline' as const, ink: 'bronce' as const, anchor: 'p0002.0010+[0,5]', text: 'teoría' },
		];

		expect(removeMarkFromState(marks, { id: 'm-1' })).toEqual([marks[1]]);
		expect(
			removeMarkFromState(marks, { chunkId: 'p0002.0010', text: 'teoría' }),
		).toEqual([marks[0]]);
	});

	it('removes a keyword by term and optional anchor', () => {
		const words = [
			{ term: 'teoría', anchor: 'p0002.0010' },
			{ term: 'Naur', anchor: 'p0001.0000' },
		];

		expect(removeWordFromState(words, { term: 'teoría', anchor: 'p0002.0010' })).toEqual([
			words[1],
		]);
	});

	it('respects intentional local mark deletions over stale server state when local is newer', () => {
		const server = {
			bookId: '1',
			marks: [{ id: 'm-1', kind: 'underline' as const, ink: 'aka' as const, anchor: 'p0001.0000+[0,5]', text: 'Naur' }],
			words: [],
			progress: { page: 3, pct: 13 },
		};
		const localRaw = JSON.stringify({
			bookId: '1',
			marks: [],
			words: [],
			progress: { page: 3, pct: 13 },
			updatedAt: Date.now(),
		});

		const merged = resolvePreferredReadingState(server, localRaw);
		expect(merged.marks).toEqual([]);
	});

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

	it('parses and steps reader preferences safely with defaults', () => {
		expect(parseReaderPrefs(null)).toEqual(DEFAULT_READER_PREFS);
		expect(
			parseReaderPrefs(
				JSON.stringify({ font: 'sans', align: 'justify', focus: 'narrow', scale: 1.2 }),
			),
		).toEqual({
			font: 'sans',
			align: 'justify',
			focus: 'narrow',
			scale: 1.2,
		});
		expect(
			parseReaderPrefs(JSON.stringify({ font: 'comic', scale: 9 })),
		).toEqual({
			...DEFAULT_READER_PREFS,
			scale: 1.35,
		});

		expect(stepReaderScale(1, 0.1)).toBe(1.1);
		expect(stepReaderScale(1.3, 0.1)).toBe(1.35);
		expect(stepReaderScale(0.85, -0.1)).toBe(0.85);
	});

	it('computes foveal band geometry proportional to line height and focus mode', () => {
		const narrow = computeFovealBandMetrics(44, 900, 'narrow');
		const wide = computeFovealBandMetrics(44, 900, 'wide');
		expect(narrow.heightPx).toBe(132);
		expect(wide.heightPx).toBe(308);
		expect(wide.topPx).toBeLessThan(narrow.topPx);
	});

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

	it('strips inline site watermarks glued onto real prose without dropping the paragraph', () => {
		const prepared = prepareChunkDisplay({
			id: 'p0004.0500',
			type: 'para',
			page: 4,
			offset: 500,
			text: 'Al día siguiente no murió nadie. www.lectulandia.com - Página 4',
			mood: 'espera',
			cues: ['nadie'],
		});

		expect(prepared).toEqual({
			kind: 'para',
			text: 'Al día siguiente no murió nadie.',
			verse: false,
		});
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

	it('dampens discrete mouse wheel deltas and caps per-event scroll jumps', () => {
		expect(computeDampedWheelDelta(0, 0, 42, 900)).toBe(0);
		expect(computeDampedWheelDelta(Number.NaN, 0, 42, 900)).toBe(0);

		const chromeWheelDown = computeDampedWheelDelta(100, 0, 42, 900);
		expect(chromeWheelDown).toBeGreaterThan(30);
		expect(chromeWheelDown).toBeLessThanOrEqual(55);

		const firefoxLineWheelUp = computeDampedWheelDelta(-3, 1, 42, 900);
		expect(firefoxLineWheelUp).toBeLessThan(-30);
		expect(firefoxLineWheelUp).toBeGreaterThanOrEqual(-60);

		const fineTrackpad = computeDampedWheelDelta(10, 0, 42, 900);
		expect(fineTrackpad).toBeCloseTo(6.5, 1);

		const hugePageJump = computeDampedWheelDelta(1, 2, 42, 900);
		expect(hugePageJump).toBeLessThanOrEqual(96);
	});

	it('clusters inline text rects into distinct visual line tops', () => {
		expect(clusterVisualLineTops([])).toEqual([]);
		expect(clusterVisualLineTops([Number.NaN, Number.POSITIVE_INFINITY])).toEqual([]);

		// Same visual line split across inline spans (.sub / .kw / dropcap), then next line, then next paragraph
		const clustered = clusterVisualLineTops([244.5, 200.2, 204.8, 198.4, 318.0, 242.1], 14);
		expect(clustered).toEqual([198.4, 242.1, 318]);
	});

	it('finds the next or previous visual line relative to the reference top', () => {
		expect(findAdjacentLineTop([], 200, 1)).toBeNull();
		expect(findAdjacentLineTop([], 200, -1)).toBeNull();

		// Line 1 at 156, Line 2 ("de pasar.") at 198, Line 3 ("Schwartz...") at 240, Line 4 at 314 (next paragraph)
		const lines = [156, 198, 240, 314];

		// Aligned on Line 2 (198): j advances to Line 3 (240), k goes back to Line 1 (156)
		expect(findAdjacentLineTop(lines, 198, 1)).toBe(240);
		expect(findAdjacentLineTop(lines, 198, -1)).toBe(156);

		// Within tolerance (+/- 6px) still advances cleanly
		expect(findAdjacentLineTop(lines, 203, 1)).toBe(240);
		expect(findAdjacentLineTop(lines, 193, -1)).toBe(156);

		// Partially scrolled between Line 2 (198) and Line 3 (240):
		// j advances to Line 3 (240), k snaps back to Line 2 (198)
		expect(findAdjacentLineTop(lines, 215, 1)).toBe(240);
		expect(findAdjacentLineTop(lines, 215, -1)).toBe(198);

		// Boundary conditions
		expect(findAdjacentLineTop(lines, 156, -1)).toBeNull();
		expect(findAdjacentLineTop(lines, 314, 1)).toBeNull();
		expect(findAdjacentLineTop(lines, 100, 1)).toBe(156);
		expect(findAdjacentLineTop(lines, 360, -1)).toBe(314);
	});
});
