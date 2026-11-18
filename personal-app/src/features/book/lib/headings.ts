import type { ReadingChunk } from '../../../entities/book/types';

import { normalizeLoose } from './textNormalize';

export type BookOpenerHeading = {
	author: string;
	title: string;
};

export function parseBookOpenerHeading(
	text: string,
	book?: { title?: string; author?: string } | null,
): BookOpenerHeading | null {
	const rawAuthor = book?.author?.trim();
	const rawTitle = book?.title?.trim();
	if (!rawAuthor || !rawTitle) return null;

	const normText = normalizeLoose(text);
	const normAuthor = normalizeLoose(rawAuthor);
	const normTitle = normalizeLoose(rawTitle);
	if (!normText || !normAuthor || !normTitle) return null;

	const combinedA = `${normAuthor} ${normTitle}`;
	const combinedB = `${normTitle} ${normAuthor}`;
	if (
		normText === combinedA ||
		normText === combinedB ||
		(normText.startsWith(normAuthor) && normText.endsWith(normTitle))
	) {
		return { author: rawAuthor, title: rawTitle };
	}

	if (normText.endsWith(normTitle) && text.trim().length > rawTitle.length) {
		const trimmed = text.trim();
		const approxPrefix = trimmed.slice(0, trimmed.length - rawTitle.length).replace(/[\s:–—-]+$/, '').trim();
		const normPrefix = normalizeLoose(approxPrefix);
		const authorTokens = normAuthor.split(' ').filter((t) => t.length >= 3);
		if (
			approxPrefix &&
			approxPrefix.length <= 70 &&
			authorTokens.some((tok) => normPrefix.includes(tok))
		) {
			return { author: approxPrefix, title: rawTitle };
		}
	}
	return null;
}

const EXPLICIT_CHAPTER_ONLY_RE =
	/^(?:cap[íi]tulo|parte|secci[óo]n|pr[óo]logo|ep[íi]logo|[ivxlcdm]+)\s*(?:[IVXLCDM]+|\d+)?\.?$/i;

export function isLikelyFalseHeading(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed) return false;
	if (/^https?:\/\//i.test(trimmed)) return true;
	if (/^[a-záéíóúüñ]/.test(trimmed)) return true;
	if (/—/.test(trimmed)) return true;
	if (/[.!?;:»"]$/.test(trimmed) && !EXPLICIT_CHAPTER_ONLY_RE.test(trimmed)) {
		return true;
	}
	return false;
}

const ROMAN_CHAPTER_RE = /^X{0,3}(?:IX|IV|V?I{0,3})$/;

export function extractLeadingChapterMarker(
	text: string,
): { marker: string; rest: string } | null {
	const trimmed = text.trim();
	if (!trimmed) return null;

	const explicitMatch = trimmed.match(
		/^((?:Cap[íi]tulo|Parte)\s+(?:[IVXLCDM]+|\d+))\s*[.:–—-]?\s+([A-ZÁÉÍÓÚÜÑ¿¡«"—].{12,})$/i,
	);
	if (explicitMatch) {
		return {
			marker: explicitMatch[1].replace(/\s+/g, ' ').trim(),
			rest: explicitMatch[2].trim(),
		};
	}

	const romanMatch = trimmed.match(
		/^([IVX]{1,6})(?:\s*[.:–—-]\s*|\s+)([A-ZÁÉÍÓÚÜÑ¿¡«"—][\s\S]{12,})$/,
	);
	if (!romanMatch) return null;

	const candidate = romanMatch[1];
	const rest = romanMatch[2].trim();
	if (!candidate || !ROMAN_CHAPTER_RE.test(candidate)) return null;
	if (candidate === 'I' && /^[A-Z]\b/.test(rest) && !/^[A-Z][a-záéíóúüñ]/.test(rest)) {
		return null;
	}

	return { marker: candidate, rest };
}

const PRINT_RUN_LINE_RE = /^(?:\d{1,3}\s+){2,}\d{1,3}$/;
const EDITION_LINE_RE =
	/^(?:\d{1,2}\s*[ªº]|primera|segunda|tercera|cuarta|quinta|sexta|s[ée]ptima|octava|novena|d[ée]cima)(?:\s+edici[óo]n)?(?:\s*[.:,–—-]\s*.{0,40})?$/i;
const CREDITS_LINE_RE =
	/^(?:traducci[óo]n|revisi[óo]n\s+t[ée]cnica|correcci[óo]n(?:\s+(?:de\s+estilo|ortogr[áa]fica))?|adaptaci[óo]n|edici[óo]n\s+al\s+cuidado\s+de|dise[ñn]o\s+de\s+(?:cubierta|portada)|ilustraci[óo]n\s+de\s+(?:cubierta|portada))(?:\s*[.:,–—-]\s*.{0,40})?$/i;
const INFO_LINE_RE = /^para\s+mayor\s+informaci[óo]n\b/i;
const DEDICATION_LINE_RE =
	/^(?:Para|PARA)\s+[A-ZÁÉÍÓÚÜÑ]|^(?:A\s+la\s+memoria\s+de|En\s+memoria\s+de|Dedicatoria)\b/;
const AFFILIATION_LINE_RE = /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ.'´\-\s]{4,60}\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]/;
const AFFILIATION_MARKER_RE =
	/,|(?:universi(?:dad|ty|teit|t[àa]t|d[áa]d)|instituto|institute|college|facultad|academia)\b/i;

export function headingLevelFromText(text: string): 1 | 2 | 3 {
	const trimmed = text.trim();
	if (/^\d+\.\d+\.\d+/.test(trimmed)) return 3;
	if (/^\d+\.\d+/.test(trimmed)) return 2;
	return 1;
}

/** Resolves the heading depth, falling back to the numbered label convention. */
export function inferHeadingLevel(chunk: ReadingChunk): 1 | 2 | 3 {
	if (chunk.level === 1 || chunk.level === 2 || chunk.level === 3) return chunk.level;
	return headingLevelFromText(chunk.text);
}

/**
 * Classifies legacy-cache frontmatter that was extracted as a heading: print
 * runs, edition lines, credits, colophon notices and author affiliations on the
 * opening pages become `meta`, while opening dedications become `dedication`.
 */
export function classifyFrontmatterHeading(
	text: string,
	page: number,
): 'meta' | 'dedication' | null {
	const trimmed = text.trim();
	if (!trimmed || page > 10) return null;
	if (INFO_LINE_RE.test(trimmed)) return 'meta';
	if (trimmed.length >= 10 && DEDICATION_LINE_RE.test(trimmed)) return 'dedication';
	if (PRINT_RUN_LINE_RE.test(trimmed)) return 'meta';
	if (trimmed.length <= 80 && EDITION_LINE_RE.test(trimmed)) return 'meta';
	if (trimmed.length <= 80 && CREDITS_LINE_RE.test(trimmed)) return 'meta';
	if (
		page <= 6 &&
		trimmed.length >= 16 &&
		AFFILIATION_LINE_RE.test(trimmed) &&
		AFFILIATION_MARKER_RE.test(trimmed)
	) {
		return 'meta';
	}
	return null;
}
