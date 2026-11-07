/**
 * Pure text transforms the full-page diario editor uses. Everything mirrors
 * what a native `textarea` + `setRangeText(..., 'end')` flow produces, so the
 * Solid island stays thin glue: it applies `EditResult` to the textarea and
 * these helpers stay testable without a DOM.
 */

export type EditResult = {
	text: string;
	caretStart: number;
	caretEnd: number;
};

/**
 * Wraps the selection with a token pair (`**`, `` ` ``, a link, a span...).
 * An empty selection wraps the `fallback` snippet, like the canvas toolbar
 * does, and the caret lands right after the inserted wrap.
 */
export function wrapSelection(
	text: string,
	start: number,
	end: number,
	before: string,
	after: string,
	fallback = 'texto'
): EditResult {
	const selection = text.slice(start, end) || fallback;
	const inserted = `${before}${selection}${after}`;
	const next = `${text.slice(0, start)}${inserted}${text.slice(end)}`;
	const caret = start + inserted.length;

	return { text: next, caretStart: caret, caretEnd: caret };
}

/**
 * Inserts a markdown block prefix (`## `, `> `, `- `) at the start of the line
 * that holds `caret`, the same line-start math the canvas toolbar uses.
 */
export function insertLinePrefix(text: string, caret: number, prefix: string): EditResult {
	const lineStart = text.lastIndexOf('\n', Math.max(0, caret - 1)) + 1;
	const next = `${text.slice(0, lineStart)}${prefix}${text.slice(lineStart)}`;
	const caretResult = lineStart + prefix.length;

	return { text: next, caretStart: caretResult, caretEnd: caretResult };
}

/** Where the slash menu anchors: `lineStart` when `/` is the whole caret line. */
export function slashTarget(text: string, caret: number): { lineStart: number } | null {
	const lineStart = text.lastIndexOf('\n', Math.max(0, caret - 1)) + 1;
	const lineText = text.slice(lineStart, caret);

	return lineText === '/' ? { lineStart } : null;
}

/** Replaces a range (the lone `/`) with the inserted block, caret after it. */
export function replaceRange(text: string, from: number, to: number, insert: string): EditResult {
	const next = `${text.slice(0, from)}${insert}${text.slice(to)}`;
	const caret = from + insert.length;

	return { text: next, caretStart: caret, caretEnd: caret };
}
