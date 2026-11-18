import type {
	ReadingChunk,
	ReadingInlineRun,
	ReadingMood,
} from '../../../entities/book/types';

import {
	extractLeadingChapterMarker,
	isLikelyFalseHeading,
	parseBookOpenerHeading,
} from './headings';
import { isNoiseChunk, type ReaderDisplayContext } from './noise';
import { stripInlineArtifacts } from './textNormalize';
import { parseTocChunk, type ParsedToc } from './toc';

const LIST_BULLET_RE = /^(?:[-–—•·*]|\d{1,2}[.)])\s+/;

/** Keeps line breaks for preformatted chunks instead of reflowing them. */
export function prepareChunkText(chunk: ReadingChunk): string {
	if (chunk.type === 'toc') return chunk.text.trim();
	if (chunk.type === 'list') return chunk.text.replace(/\r\n?/g, '\n').trim();
	if (chunk.type === 'code') {
		return chunk.text
			.replace(/\r\n?/g, '\n')
			.replace(/^(?:[ \t]*\n)+/, '')
			.replace(/\s+$/, '');
	}
	return stripInlineArtifacts(chunk.text);
}

export function normalizeListItemText(raw: string): string {
	return raw.replace(LIST_BULLET_RE, '').replace(/\s+/g, ' ').trim();
}

export type ChunkDisplay =
	| { kind: 'hidden' }
	| { kind: 'toc'; parsed: ParsedToc }
	| { kind: 'opener'; author: string; title: string }
	| { kind: 'heading'; text: string }
	| { kind: 'para'; text: string; verse: boolean; chapterMarker?: string };

export function prepareChunkDisplay(
	chunk: ReadingChunk,
	book?: { title?: string; author?: string } | null,
	context?: ReaderDisplayContext,
): ChunkDisplay {
	const cleanedText = chunk.type === 'toc' ? chunk.text : stripInlineArtifacts(chunk.text);
	if (!cleanedText || cleanedText.length < 2) {
		return { kind: 'hidden' };
	}
	const effectiveChunk = cleanedText === chunk.text ? chunk : { ...chunk, text: cleanedText };

	if (isNoiseChunk(effectiveChunk, book, context)) {
		return { kind: 'hidden' };
	}

	if (effectiveChunk.type === 'toc' || effectiveChunk.type === 'para') {
		const parsedToc = parseTocChunk(effectiveChunk.text, {
			chunkType: effectiveChunk.type,
		});
		if (parsedToc) {
			return { kind: 'toc', parsed: parsedToc };
		}
	}

	if (effectiveChunk.type === 'heading') {
		if (effectiveChunk.page <= 5) {
			const opener = parseBookOpenerHeading(effectiveChunk.text, book);
			if (opener) {
				return { kind: 'opener', author: opener.author, title: opener.title };
			}
		}
		if (isLikelyFalseHeading(effectiveChunk.text)) {
			const chapter = extractLeadingChapterMarker(effectiveChunk.text);
			if (chapter) {
				return {
					kind: 'para',
					text: chapter.rest,
					verse: false,
					chapterMarker: chapter.marker,
				};
			}
			return { kind: 'para', text: effectiveChunk.text, verse: false };
		}
		return { kind: 'heading', text: effectiveChunk.text };
	}

	if (effectiveChunk.type === 'para') {
		const chapter = extractLeadingChapterMarker(effectiveChunk.text);
		if (chapter) {
			return {
				kind: 'para',
				text: chapter.rest,
				verse: false,
				chapterMarker: chapter.marker,
			};
		}
	}

	return {
		kind: 'para',
		text: effectiveChunk.text,
		verse: effectiveChunk.type === 'verse',
	};
}

export type BookDisplayItem =
	| { kind: 'toc'; chunkId: string; chunkIds: string[]; page: number; parsed: ParsedToc }
	| { kind: 'opener'; chunkId: string; page: number; author: string; title: string }
	| {
			kind: 'heading';
			chunkId: string;
			page: number;
			text: string;
			level: 1 | 2 | 3;
			align?: 'left' | 'center' | 'right';
	  }
	| {
			kind: 'para';
			chunkId: string;
			page: number;
			mood: ReadingMood;
			cues: string[];
			text: string;
			verse: boolean;
			chapterMarker?: string;
			paraIndex: number;
			isFirstPara: boolean;
			runs?: ReadingInlineRun[];
	  }
	| {
			kind: 'quote';
			chunkId: string;
			page: number;
			mood: ReadingMood;
			cues: string[];
			text: string;
			runs?: ReadingInlineRun[];
			paraIndex: number;
	  }
	| {
			kind: 'list';
			chunkId: string;
			page: number;
			mood: ReadingMood;
			cues: string[];
			ordered: boolean;
			items: string[];
			paraIndex: number;
	  }
	| { kind: 'dedication'; chunkId: string; page: number; text: string }
	| { kind: 'meta'; chunkId: string; page: number; text: string }
	| { kind: 'caption'; chunkId: string; page: number; text: string }
	| {
			kind: 'code';
			chunkId: string;
			page: number;
			mood: ReadingMood;
			cues: string[];
			text: string;
			paraIndex: number;
	  };

/** Plain searchable text of any display item (TOC rows, list items included). */
export function displayItemPlainText(item: BookDisplayItem): string {
	if (item.kind === 'toc') return item.parsed.entries.map((entry) => entry.label).join(' ');
	if (item.kind === 'opener') return item.title;
	if (item.kind === 'list') return item.items.join(' ');
	return item.text;
}

export type PreparedBookDisplay = {
	items: BookDisplayItem[];
	totalParas: number;
};
