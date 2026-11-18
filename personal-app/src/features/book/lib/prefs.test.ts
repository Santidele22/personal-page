import { describe, expect, it } from 'vitest';

import {
	DEFAULT_READER_PREFS,
	clusterVisualLineTops,
	computeDampedWheelDelta,
	computeFovealBandMetrics,
	findAdjacentLineTop,
	parseReaderPrefs,
	stepReaderScale,
} from './prefs';

describe('reader preference helpers', () => {
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
