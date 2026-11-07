/** Statusbar numbers of the editor pane: words, lines and read time. */

/** Whitespace-separated words; markdown markers count as words on purpose —
 * the same number the canvas statusbar and the drawer readMin use. */
export function countWords(text: string): number {
	const trimmed = text.trim();

	return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Line count of the editor content (`\n` separated); empty editor → 0. */
export function countLines(text: string): number {
	return text ? text.split('\n').length : 0;
}

/** The article readMin the portada shows: words / 200 wpm, at least 1. */
export function readMinutes(text: string): number {
	return Math.max(1, Math.round(countWords(text) / 200));
}
