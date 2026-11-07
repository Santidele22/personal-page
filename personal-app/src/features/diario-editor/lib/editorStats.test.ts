import { describe, expect, it } from 'vitest';
import { countLines, countWords, readMinutes } from './editorStats';

describe('editorStats', () => {
	it('counts words and lines for a real markdown body', () => {
		const text = 'una línea\n\n- item uno\n- item dos';

		expect(countWords(text)).toBe(8);
		expect(countLines(text)).toBe(4);
	});

	it('treats an empty editor as zero content', () => {
		expect(countWords('')).toBe(0);
		expect(countLines('')).toBe(0);
	});

	it('estimates at least one reading minute at ~200 wpm', () => {
		expect(readMinutes('')).toBe(1);
		expect(readMinutes('palabra '.repeat(300))).toBe(2);
		// 2000 palabras → ~10 min.
		expect(readMinutes('palabra '.repeat(2000))).toBe(10);
	});
});
