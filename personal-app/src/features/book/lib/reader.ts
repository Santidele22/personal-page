import type {
	BookReadingState,
	ReadingChunk,
	ReadingMark,
	ReadingWord,
} from '../../../entities/book/types';

export type TocEntry = {
	label: string;
	page: number;
};

export type ParsedToc = {
	heading?: string;
	entries: TocEntry[];
};

const TOC_LEADER_RE = /\.(?:[ \t]*\.){2,}[ \t]*(\d+)(?=\s|$)/g;
const TOC_RELAXED_LINE_RE = /^(.+?)\s*(?:\.\s*)+\s*(\d+)\s*$/;
const TOC_HEADING_PREFIX_RE = /^(Índice|Indice|Tabla de contenidos|Contenido|Sumario|Index|Table of contents)(?:\s*[:\-–—]?\s+|\s*$)/i;

/**
 * Parses either a newline-separated `toc` chunk or a legacy inline paragraph
 * where `pdftotext` fused multiple `Title . . . . 12` entries together.
 * Returns `null` for ordinary prose so normal sentences with an ellipsis are
 * never misclassified.
 */
export function parseTocChunk(text: string): ParsedToc | null {
	const trimmed = text.trim();
	if (!trimmed) return null;
	if (!trimmed.includes('..') && !/\.\s+\./.test(trimmed)) return null;

	const lines = trimmed
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter(Boolean);

	const rawEntries: TocEntry[] = [];
	let strictMatches = 0;
	let heading: string | undefined;

	const extractFromLine = (segment: string, isFirst: boolean, allowRelaxed: boolean) => {
		TOC_LEADER_RE.lastIndex = 0;
		let match: RegExpExecArray | null;
		let countInSegment = 0;
		let prevEnd = 0;
		while ((match = TOC_LEADER_RE.exec(segment)) !== null) {
			let label = segment.slice(prevEnd, match.index).replace(/\s+/g, ' ').trim();
			prevEnd = match.index + match[0].length;
			const page = Number(match[1]);
			if (!label || !Number.isFinite(page)) continue;

			if (isFirst && countInSegment === 0 && !heading) {
				const headingMatch = label.match(TOC_HEADING_PREFIX_RE);
				if (headingMatch && label.length > headingMatch[0].length) {
					heading = headingMatch[1];
					label = label.slice(headingMatch[0].length).trim();
				}
			}

			label = label.replace(/(?:\s*\.)+\s*$/, '').trim();
			if (!label) continue;
			rawEntries.push({ label, page });
			strictMatches += 1;
			countInSegment += 1;
		}

		if (countInSegment === 0 && allowRelaxed) {
			const relaxed = segment.match(TOC_RELAXED_LINE_RE);
			if (relaxed) {
				let label = relaxed[1].replace(/(?:\s*\.)+\s*$/, '').replace(/\s+/g, ' ').trim();
				const page = Number(relaxed[2]);
				if (label && Number.isFinite(page)) {
					if (isFirst && !heading) {
						const headingMatch = label.match(TOC_HEADING_PREFIX_RE);
						if (headingMatch && label.length > headingMatch[0].length) {
							heading = headingMatch[1];
							label = label.slice(headingMatch[0].length).trim();
						}
					}
					if (label) {
						rawEntries.push({ label, page });
					}
				}
			}
		}
	};

	if (lines.length >= 2) {
		const strictLineCount = lines.filter((line) => {
			TOC_LEADER_RE.lastIndex = 0;
			const m = TOC_LEADER_RE.exec(line);
			return Boolean(m && line.slice(0, m.index).trim().length > 0);
		}).length;
		const allowRelaxed = strictLineCount >= 2;

		lines.forEach((line, index) => {
			TOC_LEADER_RE.lastIndex = 0;
			const firstMatch = index === 0 ? TOC_LEADER_RE.exec(line) : null;
			const hasEntry = Boolean(firstMatch && line.slice(0, firstMatch.index).trim().length > 0);
			if (index === 0 && TOC_HEADING_PREFIX_RE.test(line) && !hasEntry) {
				const hm = line.match(TOC_HEADING_PREFIX_RE);
				heading = hm ? hm[1] : line;
				return;
			}
			extractFromLine(line, index === 0, allowRelaxed);
		});
	} else {
		extractFromLine(trimmed, true, false);
	}

	if (strictMatches < 2 || rawEntries.length < 2) {
		return null;
	}

	return {
		heading,
		entries: rawEntries,
	};
}

export function removeMarkFromState(
	marks: ReadingMark[],
	target: { id?: string; chunkId?: string; text?: string },
): ReadingMark[] {
	if (target.id) {
		const idxById = marks.findIndex((m) => m.id === target.id);
		if (idxById >= 0) {
			return [...marks.slice(0, idxById), ...marks.slice(idxById + 1)];
		}
	}
	if (target.text) {
		const cleanText = target.text.trim();
		const idxByText = marks.findIndex((m) => {
			const markChunk = String(m.anchor || '').split('+')[0];
			const matchesChunk = !target.chunkId || markChunk === target.chunkId;
			return matchesChunk && (m.text || '').trim() === cleanText;
		});
		if (idxByText >= 0) {
			return [...marks.slice(0, idxByText), ...marks.slice(idxByText + 1)];
		}
	}
	return marks;
}

export function removeWordFromState(
	words: ReadingWord[],
	target: { term: string; anchor?: string },
): ReadingWord[] {
	const cleanTerm = target.term.trim();
	const idx = words.findIndex((w) => {
		if (w.term.trim() !== cleanTerm) return false;
		if (target.anchor && w.anchor) return w.anchor === target.anchor;
		return true;
	});
	if (idx < 0) return words;
	return [...words.slice(0, idx), ...words.slice(idx + 1)];
}

export type StoredReadingSnapshot = Partial<BookReadingState> & {
	updatedAt?: number;
};

export function resolvePreferredReadingState(
	serverState: BookReadingState,
	localRaw: string | null,
): BookReadingState {
	if (!localRaw) return serverState;
	try {
		const local = JSON.parse(localRaw) as StoredReadingSnapshot;
		const hasTimestamp = typeof local.updatedAt === 'number' && Number.isFinite(local.updatedAt);

		const progress =
			local.progress && (local.progress.pct ?? 0) > (serverState.progress?.pct ?? 0)
				? local.progress
				: serverState.progress;

		const marks = Array.isArray(local.marks)
			? hasTimestamp || local.marks.length > serverState.marks.length
				? local.marks
				: serverState.marks
			: serverState.marks;

		const words = Array.isArray(local.words)
			? hasTimestamp || local.words.length > serverState.words.length
				? local.words
				: serverState.words
			: serverState.words;

		return {
			bookId: serverState.bookId,
			marks,
			words,
			progress,
		};
	} catch {
		return serverState;
	}
}

export type BookOpenerHeading = {
	author: string;
	title: string;
};

function normalizeLoose(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

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

const KNOWN_EBOOK_SITES_RE =
	/\b(?:lelibros|lectulandia|ebookelo|epublibre|bajalibros|elejandria|espaebook|quedelibros|epubgratis|librodot|freeditorial|pdfdrive|z-lib|libgen)\b/i;

const EBOOK_PROMO_PHRASES_RE =
	/(?:libro\s+proporcionado\s+por|proporcionado\s+por\s+el\s+equipo|visite\s+nuestro\s+sitio|visita\s+nuestr[oa]\s+(?:sitio|web)|descarga\s+est[eo]\s+y\s+otros\s+(?:miles\s+de\s+)?libros)/i;

const DOMAIN_PAGE_WATERMARK_EXACT_RE =
	/^(?:(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\s*[-–—|·/]\s*(?:p[aá]gina|page|p[aá]g\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?|(?:p[aá]gina|page|p[aá]g\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?\s*[-–—|·/]\s*(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)$/i;

const DOMAIN_PAGE_WATERMARK_INLINE_EDGE_RE =
	/(?:^\s*(?:(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\s*[-–—|·/]\s*(?:p[aá]gina|page|p[aá]g\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?|(?:p[aá]gina|page|p[aá]g\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?\s*[-–—|·/]\s*(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)\s+|\s+(?:(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\s*[-–—|·/]\s*(?:p[aá]gina|page|p[aá]g\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?|(?:p[aá]gina|page|p[aá]g\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?\s*[-–—|·/]\s*(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)\s*$)/gi;

const STANDALONE_PAGE_NUMBER_RE =
	/^(?:[-–—[(]?\s*\d{1,4}\s*[-–—\])]|(?:p[aá]gina|page|p[aá]g\.?)\s*\d{1,4}(?:\s*(?:de|of|\/)\s*\d{1,4})?|\d{1,4})$/i;

const STANDALONE_URL_RE = /^(?:https?:\/\/\S+|www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?)$/i;
const EPUB_STAMP_RE = /\bepub\s+(?:base\s+)?r\d+(?:\.\d+)*\b/i;
const RIPPER_CREDIT_PREFIX_RE =
	/^(?:editor\s+digital|digitalizado\s+por|escaneado\s+por|maquetado\s+por|maquetaci[oó]n|correcci[oó]n\s+de\s+erratas|conversi[oó]n\s+a\s+(?:pdf|epub))\b/i;
const RIPPER_CREDIT_ANYWHERE_RE = /\b(?:digitalizado|escaneado|maquetado)\s+por\b/i;
const RIPPER_DATE_SIG_RE =
	/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_.-]{2,28}(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_.-]{2,20})?\s+\d{2}\.\d{2}\.\d{2,4}$/;
const FRONTMATTER_LEGAL_RE =
	/(?:\bisbn(?:-1[03])?\s*[:\-]?\s*[\dXx-]{10,}|^isbn\b|dep[oó]sito\s+legal|todos\s+los\s+derechos\s+reservados|reservados\s+todos\s+los\s+derechos|no\s+se\s+permite\s+la\s+reproducci[oó]n\s+total\s+o\s+parcial|^(?:copyright\s*)?©|^(?:t[ií]tulo\s+original|edici[oó]n\s+original|dise[ñn]o\s+de\s+(?:cubierta|portada)|ilustraci[oó]n\s+de\s+(?:cubierta|portada)|impreso\s+en|printed\s+in)\b)/i;

const EDGE_HEADER_CHAPTER_RE =
	/^(?:cap[íi]tulo|parte|secci[óo]n|pr[óo]logo|ep[íi]logo|[íi]ndice|tabla\s+de\s+contenidos|contenido|sumario|index|table\s+of\s+contents|[ivxlcdm]+)(?:\s+(?:[ivxlcdm]+|\d+))?\.?$/i;

export type ReaderDisplayContext = {
	repeatedNoiseKeys?: Set<string>;
	totalPages?: number;
};

export function normalizeEdgeNoiseKey(text: string): string {
	return normalizeLoose(text)
		.replace(/\b(?:pagina|page|pag\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?\b/g, 'pagina #')
		.replace(/^\d+(?:\s*[-–—|·]\s*|\s+)/g, '# ')
		.replace(/(?:\s*[-–—|·]\s*|\s+)\d+$/g, ' #')
		.replace(/\s+/g, ' ')
		.trim();
}

function isRepeatedEdgeCandidate(
	chunk: ReadingChunk,
	book?: { title?: string; author?: string } | null,
): boolean {
	const trimmed = chunk.text.trim();
	if (!trimmed || trimmed.length > 100) return false;
	if (chunk.type === 'toc' || chunk.type === 'verse') return false;
	if (/^—/.test(trimmed)) return false;
	if (EDGE_HEADER_CHAPTER_RE.test(trimmed)) return false;
	if (chunk.page <= 5 && parseBookOpenerHeading(trimmed, book)) return false;
	const key = normalizeEdgeNoiseKey(trimmed);
	const hasPageToken = key.includes('#') || /\b(?:https?:\/\/|www\.|\.[a-z]{2,4})\b/i.test(trimmed);
	if (!hasPageToken && /[.!?;:»"]$/.test(trimmed)) return false;
	return Boolean(key);
}

export function collectRepeatedEdgeNoise(
	chunks: ReadingChunk[],
	pdfPages: number,
	book?: { title?: string; author?: string } | null,
): Set<string> {
	const pagesMap = new Map<number, ReadingChunk[]>();
	for (const chunk of chunks) {
		const list = pagesMap.get(chunk.page);
		if (list) list.push(chunk);
		else pagesMap.set(chunk.page, [chunk]);
	}

	const keyPages = new Map<string, Set<number>>();
	for (const [page, pageChunks] of pagesMap.entries()) {
		const edgeChunks =
			pageChunks.length === 1 ? [pageChunks[0]] : [pageChunks[0], pageChunks[pageChunks.length - 1]];
		for (const edge of edgeChunks) {
			if (!isRepeatedEdgeCandidate(edge, book)) continue;
			const key = normalizeEdgeNoiseKey(edge.text);
			if (!key) continue;
			const pages = keyPages.get(key) ?? new Set<number>();
			pages.add(page);
			keyPages.set(key, pages);
		}
	}

	const repeated = new Set<string>();
	for (const [key, pages] of keyPages.entries()) {
		const hasMarker = key.includes('#') || /(?:https?:\/\/|www\.|\.(?:com|org|net|es|info|io)\b)/i.test(key);
		const minPages = pdfPages <= 6 && hasMarker ? 2 : 3;
		if (pages.size >= minPages) {
			repeated.add(key);
		}
	}
	return repeated;
}

export function stripInlineArtifacts(text: string): string {
	let cleaned = text.trim();
	if (!cleaned) return '';

	for (let i = 0; i < 2; i++) {
		const next = cleaned
			.replace(DOMAIN_PAGE_WATERMARK_INLINE_EDGE_RE, ' ')
			.replace(/\s+https?:\/\/(?:www\.)?(?:lelibros|lectulandia|ebookelo|epublibre|bajalibros|elejandria|espaebook|quedelibros|epubgratis|librodot)[^\s]*$/i, '')
			.replace(/^https?:\/\/(?:www\.)?(?:lelibros|lectulandia|ebookelo|epublibre|bajalibros|elejandria|espaebook|quedelibros|epubgratis|librodot)[^\s]*\s+/i, '')
			.replace(/\s+/g, ' ')
			.trim();
		if (next === cleaned) break;
		cleaned = next;
	}
	return cleaned;
}

export function isNoiseChunk(
	chunk: ReadingChunk,
	book?: { title?: string; author?: string } | null,
	context?: ReaderDisplayContext,
): boolean {
	const trimmed = chunk.text.trim();
	if (!trimmed) return true;
	if (chunk.type === 'toc') return false;

	const totalPages = context?.totalPages;
	const isEdgeMatter =
		chunk.page <= 8 || (typeof totalPages === 'number' && totalPages > 0 && chunk.page >= totalPages - 3);

	if (STANDALONE_PAGE_NUMBER_RE.test(trimmed)) return true;
	if (DOMAIN_PAGE_WATERMARK_EXACT_RE.test(trimmed)) return true;
	if (EBOOK_PROMO_PHRASES_RE.test(trimmed) && trimmed.length <= 280) return true;
	if (KNOWN_EBOOK_SITES_RE.test(trimmed) && trimmed.length <= 220) return true;
	if (EPUB_STAMP_RE.test(trimmed) && trimmed.length <= 220) return true;
	if (RIPPER_CREDIT_PREFIX_RE.test(trimmed) && trimmed.length <= 240) return true;
	if (RIPPER_CREDIT_ANYWHERE_RE.test(trimmed) && trimmed.length <= 160) return true;

	if (STANDALONE_URL_RE.test(trimmed)) {
		if (KNOWN_EBOOK_SITES_RE.test(trimmed) || isEdgeMatter) return true;
	}

	if (isEdgeMatter) {
		if (RIPPER_DATE_SIG_RE.test(trimmed)) return true;
		if (trimmed.length <= 320 && FRONTMATTER_LEGAL_RE.test(trimmed)) return true;
	}

	if (context?.repeatedNoiseKeys && context.repeatedNoiseKeys.size > 0) {
		if (!(chunk.page <= 5 && parseBookOpenerHeading(trimmed, book))) {
			const key = normalizeEdgeNoiseKey(trimmed);
			if (key && context.repeatedNoiseKeys.has(key)) {
				return true;
			}
		}
	}

	return false;
}

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
		const parsedToc = parseTocChunk(effectiveChunk.text);
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

export type ReaderFont = 'serif' | 'sans';
export type ReaderAlign = 'left' | 'justify';
export type ReaderFocusMode = 'wide' | 'narrow' | 'off';

export type ReaderPrefs = {
	font: ReaderFont;
	align: ReaderAlign;
	focus: ReaderFocusMode;
	scale: number;
};

export const DEFAULT_READER_PREFS: ReaderPrefs = {
	font: 'serif',
	align: 'left',
	focus: 'wide',
	scale: 1,
};

export function clampReaderScale(scale: number): number {
	if (!Number.isFinite(scale)) return DEFAULT_READER_PREFS.scale;
	const clamped = Math.min(1.35, Math.max(0.85, scale));
	return Math.round(clamped * 100) / 100;
}

export function stepReaderScale(current: number, delta: number): number {
	return clampReaderScale(current + delta);
}

export function parseReaderPrefs(raw: string | null): ReaderPrefs {
	if (!raw) return { ...DEFAULT_READER_PREFS };
	try {
		const parsed = JSON.parse(raw) as Partial<ReaderPrefs>;
		const font: ReaderFont = parsed.font === 'sans' || parsed.font === 'serif'
			? parsed.font
			: DEFAULT_READER_PREFS.font;
		const align: ReaderAlign = parsed.align === 'justify' || parsed.align === 'left'
			? parsed.align
			: DEFAULT_READER_PREFS.align;
		const focus: ReaderFocusMode =
			parsed.focus === 'wide' || parsed.focus === 'narrow' || parsed.focus === 'off'
				? parsed.focus
				: DEFAULT_READER_PREFS.focus;
		const scale =
			typeof parsed.scale === 'number'
				? clampReaderScale(parsed.scale)
				: DEFAULT_READER_PREFS.scale;
		return { font, align, focus, scale };
	} catch {
		return { ...DEFAULT_READER_PREFS };
	}
}

export function computeFovealBandMetrics(
	lineHeightPx: number,
	viewportHeightPx: number,
	focusMode: ReaderFocusMode,
): { topPx: number; heightPx: number; bottomPx: number } {
	const safeLine = Math.min(72, Math.max(24, Number.isFinite(lineHeightPx) ? lineHeightPx : 42));
	const safeVh = Math.min(2400, Math.max(360, Number.isFinite(viewportHeightPx) ? viewportHeightPx : 900));

	if (focusMode === 'off') {
		return { topPx: 0, heightPx: safeVh, bottomPx: safeVh };
	}
	if (focusMode === 'narrow') {
		const heightPx = Math.round(safeLine * 3);
		const topPx = Math.round(safeVh * 0.29);
		return { topPx, heightPx, bottomPx: topPx + heightPx };
	}
	const heightPx = Math.round(safeLine * 7);
	const topPx = Math.round(safeVh * 0.21);
	return { topPx, heightPx, bottomPx: topPx + heightPx };
}

function clampReaderLineHeight(lineHeightPx: number): number {
	return Math.min(72, Math.max(24, Number.isFinite(lineHeightPx) ? lineHeightPx : 42));
}

export function computeDampedWheelDelta(
	deltaY: number,
	deltaMode: number,
	lineHeightPx: number,
	viewportHeightPx: number,
): number {
	if (!Number.isFinite(deltaY) || deltaY === 0) return 0;
	const safeLine = clampReaderLineHeight(lineHeightPx);
	const safeVh = Math.min(2400, Math.max(360, Number.isFinite(viewportHeightPx) ? viewportHeightPx : 900));

	let rawPx = deltaY;
	if (deltaMode === 1) {
		rawPx = deltaY * safeLine;
	} else if (deltaMode === 2) {
		rawPx = deltaY * safeVh * 0.85;
	}

	const isFinePixelScroll = deltaMode === 0 && Math.abs(rawPx) < 32;
	const damped = rawPx * (isFinePixelScroll ? 0.65 : 0.42);
	const maxStep = Math.round(safeLine * 2.2);
	return Math.max(-maxStep, Math.min(maxStep, damped));
}

export function clusterVisualLineTops(
	rawTops: readonly number[],
	minGapPx = 12,
): number[] {
	const safeMinGap = Number.isFinite(minGapPx) && minGapPx >= 0 ? minGapPx : 12;
	const sorted = rawTops.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
	const lines: number[] = [];
	for (const top of sorted) {
		if (lines.length === 0 || top - lines[lines.length - 1] > safeMinGap) {
			lines.push(top);
		}
	}
	return lines;
}

export function findAdjacentLineTop(
	lineTops: readonly number[],
	referenceTopPx: number,
	direction: 1 | -1,
	tolerancePx = 6,
): number | null {
	if (!Number.isFinite(referenceTopPx) || lineTops.length === 0) return null;
	const safeTolerance = Number.isFinite(tolerancePx) && tolerancePx >= 0 ? tolerancePx : 6;

	if (direction > 0) {
		for (let i = 0; i < lineTops.length; i += 1) {
			const top = lineTops[i];
			if (Number.isFinite(top) && top > referenceTopPx + safeTolerance) {
				return top;
			}
		}
		return null;
	}

	for (let i = lineTops.length - 1; i >= 0; i -= 1) {
		const top = lineTops[i];
		if (Number.isFinite(top) && top < referenceTopPx - safeTolerance) {
			return top;
		}
	}
	return null;
}
