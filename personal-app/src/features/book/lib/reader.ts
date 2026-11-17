import type {
	BookReadingState,
	ReadingChunk,
	ReadingChunkType,
	ReadingInlineRun,
	ReadingMark,
	ReadingMood,
	ReadingWord,
} from '../../../entities/book/types';

export type TocEntry = {
	label: string;
	page: number;
	pageLabel?: string;
	/** Hierarchy depth derived from a numbered label (`1` top level, `2` section, `3` subsection). */
	level?: 1 | 2 | 3;
};

export type ParsedToc = {
	heading?: string;
	entries: TocEntry[];
};

export type ParseTocOptions = {
	chunkType?: ReadingChunkType;
	inTocContext?: boolean;
};

const TOC_LEADER_RE =
	/(?:\.(?:[ \t]*\.){1,}|[-–—_·•](?:[ \t]*[-–—_·•]){1,}|[ \t]+[-–—·.][ \t]+)[ \t]*(\d{1,4}|[ivxlcdm]{1,7})(?=\s|$)/gi;
const TOC_TAB_OR_MULTISPACE_RE =
	/^(.+?)(?:\t+|[ ]{2,})(\d{1,4}|[ivxlcdm]{1,7})\s*$/i;
const TOC_SINGLE_SPACE_RE = /^(.+?)[ ]+(\d{1,4})\s*$/;
const TOC_PAGE_FIRST_RE =
	/^(\d{1,4})(?:\t+|[ ]{2,}|[ \t]*[·|–—-][ \t]*)([A-ZÁÉÍÓÚÜÑ¿¡«"0-9].{1,140})$/;
const TOC_HEADING_PREFIX_RE =
	/^(Índice(?:\s+general|\s+de\s+contenidos)?|Indice(?:\s+general|\s+de\s+contenidos)?|Tabla de contenidos|Contenidos?|Sumario|Index|Table of contents|Contents)(?:\s*[:\-–—]?\s+|\s*$)/i;
const TOC_STANDALONE_HEADING_RE =
	/^(?:Índice(?:\s+general|\s+de\s+contenidos)?|Indice(?:\s+general|\s+de\s+contenidos)?|Tabla de contenidos|Contenidos?|Sumario|Index|Table of contents|Contents)\s*[:\-–—]?\s*$/i;

function parseRomanNumeral(raw: string): number | null {
	const upper = raw.trim().toUpperCase();
	if (!/^[IVXLCDM]{1,7}$/.test(upper)) return null;
	if (!/^M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/.test(upper)) {
		return null;
	}
	const values: Record<string, number> = {
		I: 1,
		V: 5,
		X: 10,
		L: 50,
		C: 100,
		D: 500,
		M: 1000,
	};
	let total = 0;
	for (let i = 0; i < upper.length; i += 1) {
		const cur = values[upper[i]];
		const next = values[upper[i + 1]] ?? 0;
		total += cur < next ? -cur : cur;
	}
	return total > 0 && total <= 500 ? total : null;
}

function parseTocPageToken(raw: string): { page: number; pageLabel?: string } | null {
	const token = raw.trim();
	if (!token) return null;
	if (/^\d{1,4}$/.test(token)) {
		const page = Number(token);
		if (!Number.isFinite(page) || page < 1 || page > 5000) return null;
		return { page };
	}
	const roman = parseRomanNumeral(token);
	if (roman !== null) {
		return { page: roman, pageLabel: token };
	}
	return null;
}

function cleanTocLabel(raw: string): string {
	return stripInlineArtifacts(raw)
		.replace(/(?:\s*[.\-–—_·•])+\s*$/, '')
		.replace(/^(?:\s*[.\-–—_·•])+\s*/, '')
		.replace(/\s+/g, ' ')
		.trim();
}

const LEADERLESS_SECTION_NUMBER_RE = /(?:^|\s)\d+\.\d+(?:\.\d+)*\s/;
const LEADERLESS_TOC_SPLIT_RE =
	/\s(\d{1,4})(?=\s+(?:\d+\.\d+(?:\.\d+)*\s|[A-ZÁÉÍÓÚÜÑ¿¡«"])|\s*$)/g;
const GLUED_TOC_ENTRY_RE = /\s\d{1,4}\s+(?:\d+\.\d+(?:\.\d+)*\s|[A-ZÁÉÍÓÚÜÑ¿¡«"])/;

/** Derives the TOC hierarchy depth from a numbered entry label. */
function computeTocEntryLevel(label: string): 1 | 2 | 3 {
	const match = label.trim().match(/^(\d+(?:\.\d+)*)(?=\s)/);
	if (!match) return 1;
	const depth = match[1].split('.').length;
	if (depth >= 3) return 3;
	return depth === 2 ? 2 : 1;
}

/**
 * Attaches the label hierarchy to an entry. Top-level entries omit `level` so
 * documents parsed before the hierarchy existed keep byte-identical entries.
 */
function withTocLevel(entry: TocEntry): TocEntry {
	const level = computeTocEntryLevel(entry.label);
	if (level > 1) return { ...entry, level };
	if (entry.level === undefined) return entry;
	const { level: _dropped, ...rest } = entry;
	return rest;
}

/**
 * Splits a leaderless numbered TOC block (`¿QUÉ ES ...? 3 1.1.1 ... 4`) into
 * individual entries. Returns `null` unless the block is unambiguously a
 * numbered table of contents, so ordinary prose is never reflowed.
 */
export function splitLeaderlessNumberedToc(text: string): TocEntry[] | null {
	const flattened = text.replace(/\s+/g, ' ').trim();
	// A standalone TOC heading (`CONTENIDO`) is not an entry of its own.
	const headingMatch = flattened.match(TOC_HEADING_PREFIX_RE);
	const flat = (headingMatch ? flattened.slice(headingMatch[0].length) : flattened).trim();
	if (flat.length < 12) return null;
	if (!LEADERLESS_SECTION_NUMBER_RE.test(flat)) return null;

	const entries: TocEntry[] = [];
	let prev = 0;
	LEADERLESS_TOC_SPLIT_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = LEADERLESS_TOC_SPLIT_RE.exec(flat)) !== null) {
		const label = cleanTocLabel(flat.slice(prev, match.index));
		const page = Number(match[1]);
		prev = match.index + match[0].length;
		if (!label || label.length > 160) return null;
		if (!Number.isFinite(page) || page < 1 || page > 5000) return null;
		entries.push(withTocLevel({ label, page }));
	}
	if (entries.length < 2) return null;
	if (prev !== flat.length) return null;
	return entries;
}

function isStandaloneTocHeading(text: string): boolean {
	return TOC_STANDALONE_HEADING_RE.test(text.trim());
}

function extractStandaloneTocHeading(text: string): string {
	const match = text.trim().match(TOC_HEADING_PREFIX_RE);
	return match ? match[1].trim() : text.trim();
}

function isLikelyYearOnlySet(entries: readonly TocEntry[]): boolean {
	return entries.length > 0 && entries.every((e) => !e.pageLabel && e.page >= 1800 && e.page <= 2100);
}

function lineMatchesExplicitLeaderOrGap(line: string): boolean {
	TOC_LEADER_RE.lastIndex = 0;
	const leaderMatch = TOC_LEADER_RE.exec(line);
	if (leaderMatch && line.slice(0, leaderMatch.index).trim().length > 0) {
		return parseTocPageToken(leaderMatch[1]) !== null;
	}
	const gapMatch = line.match(TOC_TAB_OR_MULTISPACE_RE);
	if (gapMatch && gapMatch[1].trim().length > 0) {
		return parseTocPageToken(gapMatch[2]) !== null;
	}
	return false;
}

const TOC_STANDALONE_PAGE_FRAGMENT_RE =
	/^(?:[.\-–—_·•]+\s*)?(\d{1,4}|[ivxlcdm]{1,7})\s*$/i;

function coalesceWrappedTocLines(
	lines: readonly string[],
	allowStandalonePageFragment: boolean,
): string[] {
	const merged: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const current = lines[i];
		const next = lines[i + 1];
		const nextIsExplicitFragment = Boolean(
			next &&
				TOC_STANDALONE_PAGE_FRAGMENT_RE.test(next) &&
				(allowStandalonePageFragment || /^[.\-–—_·•]{2,}/.test(next.trim())),
		);
		if (
			next &&
			!isStandaloneTocHeading(current) &&
			!lineMatchesExplicitLeaderOrGap(current) &&
			!TOC_SINGLE_SPACE_RE.test(current) &&
			!TOC_PAGE_FIRST_RE.test(current) &&
			current.length <= 110 &&
			!/[.!?;:»"]$/.test(current) &&
			(lineMatchesExplicitLeaderOrGap(next) ||
				TOC_SINGLE_SPACE_RE.test(next) ||
				nextIsExplicitFragment)
		) {
			merged.push(`${current.trim()} ${next.trim()}`);
			i += 2;
			continue;
		}
		merged.push(current);
		i += 1;
	}
	return merged;
}

/**
 * Parses a `toc` chunk, a multi-line TOC block (with dot/dash/tab/space
 * leaders or Roman folios), a legacy inline `Title . . . . 12` paragraph, or
 * a single-entry chunk inside an active TOC sequence.
 * Returns `null` for ordinary prose so normal sentences with an ellipsis are
 * never misclassified.
 */
export function parseTocChunk(text: string, options: ParseTocOptions = {}): ParsedToc | null {
	const trimmed = text.trim();
	if (!trimmed) return null;

	const isTypedToc = options.chunkType === 'toc';
	const inTocContext = Boolean(options.inTocContext);

	const rawLines = trimmed
		.split('\n')
		.map((line) => line.replace(/[ ]+/g, ' ').trim())
		.filter(Boolean);

	// Preserve tabs on the original split when needed for tab-aligned columns
	const tabAwareLines = trimmed
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	const hasAnyLeader =
		trimmed.includes('..') ||
		/\.\s+\./.test(trimmed) ||
		/[-–—_·•]{2,}/.test(trimmed) ||
		/\t/.test(trimmed) ||
		/[ ]{2,}/.test(trimmed);
	const hasHeadingPrefix = TOC_HEADING_PREFIX_RE.test(trimmed);
	const leaderlessEntries = splitLeaderlessNumberedToc(trimmed);

	if (
		!isTypedToc &&
		!inTocContext &&
		!hasAnyLeader &&
		!hasHeadingPrefix &&
		rawLines.length < 2 &&
		!leaderlessEntries
	) {
		return null;
	}

	const rawEntries: TocEntry[] = [];
	let strongMatches = 0;
	let heading: string | undefined;

	const consumeHeadingPrefix = (label: string, allowAssign: boolean): string => {
		const headingMatch = label.match(TOC_HEADING_PREFIX_RE);
		if (headingMatch && label.length > headingMatch[0].length) {
			if (allowAssign && !heading) {
				heading = headingMatch[1].trim();
			}
			return label.slice(headingMatch[0].length).trim();
		}
		return label;
	};

	const pushEntry = (rawLabel: string, rawPage: string, isStrong: boolean, allowHeadingStrip: boolean) => {
		const pageInfo = parseTocPageToken(rawPage);
		if (!pageInfo) return false;
		let label = cleanTocLabel(rawLabel);
		if (allowHeadingStrip && rawEntries.length === 0 && !heading) {
			label = cleanTocLabel(consumeHeadingPrefix(label, true));
		}
		if (!label) return false;
		const entry: TocEntry = pageInfo.pageLabel
			? { label, page: pageInfo.page, pageLabel: pageInfo.pageLabel }
			: { label, page: pageInfo.page };
		rawEntries.push(withTocLevel(entry));
		if (isStrong) strongMatches += 1;
		return true;
	};

	const extractFromLine = (segment: string, isFirst: boolean, allowSingleSpace: boolean, allowPageFirst: boolean) => {
		TOC_LEADER_RE.lastIndex = 0;
		let match: RegExpExecArray | null;
		let countInSegment = 0;
		let prevEnd = 0;
		while ((match = TOC_LEADER_RE.exec(segment)) !== null) {
			const rawLabel = segment.slice(prevEnd, match.index);
			prevEnd = match.index + match[0].length;
			if (pushEntry(rawLabel, match[1], true, isFirst && countInSegment === 0)) {
				countInSegment += 1;
			}
		}

		if (countInSegment > 0) return;

		const tabGapMatch = segment.match(TOC_TAB_OR_MULTISPACE_RE);
		if (tabGapMatch) {
			if (pushEntry(tabGapMatch[1], tabGapMatch[2], true, isFirst)) {
				return;
			}
		}

		if (allowPageFirst) {
			const pfMatch = segment.match(TOC_PAGE_FIRST_RE);
			if (pfMatch) {
				const ok = pushEntry(pfMatch[2], pfMatch[1], true, false);
				if (ok) return;
			}
		}

		if (allowSingleSpace) {
			const singleMatch = segment.match(TOC_SINGLE_SPACE_RE);
			if (singleMatch) {
				const candidateLabel = singleMatch[1].trim();
				if (candidateLabel && !/[.!?;:,(]$/.test(candidateLabel)) {
					pushEntry(candidateLabel, singleMatch[2], isTypedToc || inTocContext || hasHeadingPrefix, isFirst);
				}
			}
		}
	};

	if (tabAwareLines.length >= 2) {
		const workingLines = [...tabAwareLines];
		if (isStandaloneTocHeading(workingLines[0])) {
			heading = extractStandaloneTocHeading(workingLines[0]);
			workingLines.shift();
		} else if (TOC_HEADING_PREFIX_RE.test(workingLines[0])) {
			const m = workingLines[0].match(TOC_HEADING_PREFIX_RE);
			if (m && !lineMatchesExplicitLeaderOrGap(workingLines[0])) {
				const rest = workingLines[0].slice(m[0].length).trim();
				if (!rest) {
					heading = m[1].trim();
					workingLines.shift();
				}
			}
		}

		const coalesced = coalesceWrappedTocLines(
			workingLines,
			isTypedToc || inTocContext || Boolean(heading) || hasHeadingPrefix,
		);
		const strongLineCount = coalesced.filter((line) => lineMatchesExplicitLeaderOrGap(line)).length;
		const pageFirstCount = coalesced.filter((line) => TOC_PAGE_FIRST_RE.test(line)).length;
		const allowSingleSpace =
			isTypedToc || inTocContext || Boolean(heading) || hasHeadingPrefix || strongLineCount >= 2;
		const allowPageFirst =
			isTypedToc || inTocContext || Boolean(heading) || hasHeadingPrefix || pageFirstCount >= 2;

		coalesced.forEach((line, index) => {
			if (isStandaloneTocHeading(line)) {
				if (!heading) heading = extractStandaloneTocHeading(line);
				return;
			}
			extractFromLine(line, index === 0, allowSingleSpace, allowPageFirst);
		});
	} else if (tabAwareLines.length === 1) {
		const single = tabAwareLines[0];
		extractFromLine(single, true, isTypedToc || inTocContext || hasHeadingPrefix, isTypedToc || inTocContext);

		// Inline space-separated TOC (e.g. type:'toc' or headed inline block without dots)
		if (rawEntries.length < 2 && (isTypedToc || inTocContext || hasHeadingPrefix)) {
			let body = single;
			if (hasHeadingPrefix && !heading) {
				const hm = body.match(TOC_HEADING_PREFIX_RE);
				if (hm && body.length > hm[0].length) {
					heading = hm[1].trim();
					body = body.slice(hm[0].length).trim();
				}
			}
			const inlineEntries: TocEntry[] = [];
			const inlineRe = /\s+(\d{1,4})(?=\s+[A-ZÁÉÍÓÚÜÑ¿¡«"0-9]|\s*$)/g;
			let m: RegExpExecArray | null;
			let prev = 0;
			while ((m = inlineRe.exec(body)) !== null) {
				const segLabel = cleanTocLabel(body.slice(prev, m.index));
				prev = m.index + m[0].length;
				const pageInfo = parseTocPageToken(m[1]);
				if (segLabel && pageInfo) {
					inlineEntries.push(withTocLevel({ label: segLabel, page: pageInfo.page }));
				}
			}
			if (inlineEntries.length >= 2) {
				rawEntries.length = 0;
				rawEntries.push(...inlineEntries);
				strongMatches = inlineEntries.length;
			}
		}
	}

	// Rebuild rows that swallowed a page break (`¿QUÉ ES ...? 3 1.1.1 ...`).
	if (
		leaderlessEntries &&
		leaderlessEntries.length > rawEntries.length &&
		rawEntries.some((entry) => GLUED_TOC_ENTRY_RE.test(entry.label))
	) {
		rawEntries.length = 0;
		rawEntries.push(...leaderlessEntries);
		strongMatches = leaderlessEntries.length;
	}

	const minRequired = isTypedToc || inTocContext ? 1 : 2;
	if (rawEntries.length < minRequired) {
		return null;
	}
	if (!isTypedToc && !inTocContext && strongMatches < 2) {
		return null;
	}
	if (!isTypedToc && !inTocContext && !hasHeadingPrefix && !hasAnyLeader && isLikelyYearOnlySet(rawEntries)) {
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

function headingLevelFromText(text: string): 1 | 2 | 3 {
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

const LIST_BULLET_RE = /^(?:[-–—•·*]|\d{1,2}[.)])\s+/;

/** Keeps line breaks for preformatted chunks instead of reflowing them. */
function prepareChunkText(chunk: ReadingChunk): string {
	if (chunk.type === 'toc') return chunk.text.trim();
	if (chunk.type === 'list' || chunk.type === 'code') return chunk.text.replace(/\r\n?/g, '\n').trim();
	return stripInlineArtifacts(chunk.text);
}

function normalizeListItemText(raw: string): string {
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
function displayItemPlainText(item: BookDisplayItem): string {
	if (item.kind === 'toc') return item.parsed.entries.map((entry) => entry.label).join(' ');
	if (item.kind === 'opener') return item.title;
	if (item.kind === 'list') return item.items.join(' ');
	return item.text;
}

export type PreparedBookDisplay = {
	items: BookDisplayItem[];
	totalParas: number;
};

/**
 * Normalizes a full book's raw chunks in one linear pass: filters repeated
 * noise, recognizes dotted and non-dotted TOCs (including single-entry or
 * multi-page split TOCs), merges adjacent TOC blocks into one unified list,
 * and assigns global paragraph indices for accurate progressive scroll progress.
 */
export function prepareBookDisplayItems(
	chunks: readonly ReadingChunk[],
	pdfPages: number,
	book?: { title?: string; author?: string } | null,
): PreparedBookDisplay {
	const repeatedNoiseKeys = collectRepeatedEdgeNoise([...chunks], pdfPages, book);
	const context: ReaderDisplayContext = { repeatedNoiseKeys, totalPages: pdfPages };

	const activeChunks: ReadingChunk[] = [];
	for (const chunk of chunks) {
		const cleanedText = prepareChunkText(chunk);
		if (!cleanedText || cleanedText.length < 2) continue;
		const effective = cleanedText === chunk.text ? chunk : { ...chunk, text: cleanedText };
		if (isNoiseChunk(effective, book, context)) continue;
		activeChunks.push(effective);
	}

	const items: BookDisplayItem[] = [];
	let totalParas = 0;
	let firstParaAssigned = false;
	let inTocContext = false;
	let pendingTocHeading: { text: string; chunkId: string; page: number } | undefined;

	// Legacy v1 cache rescue: a numbered section heading (`1.1`) followed by a
	// leaderless TOC block (`¿QUÉ ES ...? 3 1.1.1 ... 4`) was extracted as a
	// heading + paragraph pair. Rebuild the hierarchical TOC rows instead.
	const rescuedTocEntries = new Map<string, TocEntry[]>();
	const consumedHeadingIds = new Set<string>();
	for (let i = 0; i < activeChunks.length - 1; i += 1) {
		const candidate = activeChunks[i];
		if (candidate.type !== 'heading') continue;
		const sectionNumber = candidate.text.trim();
		if (!/^\d+\.\d+$/.test(sectionNumber)) continue;
		const body = activeChunks[i + 1];
		if (body.type !== 'para' && body.type !== 'toc') continue;
		if (rescuedTocEntries.has(body.id)) continue;
		const entries = splitLeaderlessNumberedToc(body.text);
		if (!entries || entries.length < 2) continue;
		const first = entries[0];
		entries[0] = first.label.startsWith(`${sectionNumber} `)
			? first
			: withTocLevel({ ...first, label: `${sectionNumber} ${first.label}` });
		rescuedTocEntries.set(body.id, entries);
		consumedHeadingIds.add(candidate.id);
		i += 1;
	}

	const flushPendingTocHeading = () => {
		if (!pendingTocHeading) return;
		items.push({
			kind: 'heading',
			chunkId: pendingTocHeading.chunkId,
			page: pendingTocHeading.page,
			text: pendingTocHeading.text,
			level: headingLevelFromText(pendingTocHeading.text),
		});
		pendingTocHeading = undefined;
	};

	const pushMeta = (chunk: ReadingChunk) => {
		const prev = items[items.length - 1];
		if (prev && prev.kind === 'meta' && prev.page === chunk.page) {
			prev.text = `${prev.text}\n${chunk.text}`;
			return;
		}
		items.push({ kind: 'meta', chunkId: chunk.id, page: chunk.page, text: chunk.text });
	};

	const pushToc = (chunk: ReadingChunk, parsed: ParsedToc) => {
		if (pendingTocHeading) {
			if (!parsed.heading) parsed.heading = pendingTocHeading.text;
			pendingTocHeading = undefined;
		}
		const prev = items[items.length - 1];
		if (prev && prev.kind === 'toc') {
			prev.chunkIds.push(chunk.id);
			if (!prev.parsed.heading && parsed.heading) {
				prev.parsed.heading = parsed.heading;
			}
			for (const entry of parsed.entries) {
				const lastEntry = prev.parsed.entries[prev.parsed.entries.length - 1];
				if (
					lastEntry &&
					lastEntry.label === entry.label &&
					lastEntry.page === entry.page &&
					lastEntry.pageLabel === entry.pageLabel
				) {
					continue;
				}
				prev.parsed.entries.push(entry);
			}
			return;
		}
		items.push({
			kind: 'toc',
			chunkId: chunk.id,
			chunkIds: [chunk.id],
			page: chunk.page,
			parsed: {
				heading: parsed.heading,
				entries: [...parsed.entries],
			},
		});
	};

	for (let i = 0; i < activeChunks.length; i += 1) {
		const chunk = activeChunks[i];

		if (consumedHeadingIds.has(chunk.id)) continue;
		const rescuedEntries = rescuedTocEntries.get(chunk.id);
		if (rescuedEntries) {
			pushToc(chunk, { entries: rescuedEntries.map((entry) => ({ ...entry })) });
			inTocContext = true;
			continue;
		}

		const prevIsToc = items.length > 0 && items[items.length - 1].kind === 'toc';

		if (
			(chunk.type === 'heading' || chunk.type === 'para') &&
			isStandaloneTocHeading(chunk.text)
		) {
			const nextChunk = activeChunks[i + 1];
			const nextLooksToc = Boolean(
				nextChunk &&
					(nextChunk.type === 'toc' ||
						parseTocChunk(nextChunk.text, {
							chunkType: nextChunk.type,
							inTocContext: true,
						})),
			);
			if (prevIsToc) {
				// Repeated "Índice" header on continuation page of the same TOC
				inTocContext = true;
				continue;
			}
			if (nextLooksToc) {
				pendingTocHeading = {
					text: extractStandaloneTocHeading(chunk.text),
					chunkId: chunk.id,
					page: chunk.page,
				};
				inTocContext = true;
				continue;
			}
		}

		let forceSingleEntryToc = false;
		if (!inTocContext && !prevIsToc && chunk.type === 'para' && lineMatchesExplicitLeaderOrGap(chunk.text)) {
			const nextChunk = activeChunks[i + 1];
			if (
				nextChunk &&
				(nextChunk.type === 'toc' ||
					(nextChunk.type === 'para' && lineMatchesExplicitLeaderOrGap(nextChunk.text)))
			) {
				forceSingleEntryToc = true;
			}
		}

		if (chunk.type === 'toc' || chunk.type === 'para') {
			const parsedToc = parseTocChunk(chunk.text, {
				chunkType: chunk.type,
				inTocContext: inTocContext || prevIsToc || forceSingleEntryToc,
			});
			if (parsedToc) {
				pushToc(chunk, parsedToc);
				inTocContext = true;
				continue;
			}
		}

		flushPendingTocHeading();
		inTocContext = false;

		if (chunk.type === 'heading') {
			if (chunk.page <= 5) {
				const opener = parseBookOpenerHeading(chunk.text, book);
				if (opener) {
					items.push({
						kind: 'opener',
						chunkId: chunk.id,
						page: chunk.page,
						author: opener.author,
						title: opener.title,
					});
					continue;
				}
			}
			const frontmatter = classifyFrontmatterHeading(chunk.text, chunk.page);
			if (frontmatter === 'dedication') {
				items.push({
					kind: 'dedication',
					chunkId: chunk.id,
					page: chunk.page,
					text: chunk.text,
				});
				continue;
			}
			if (frontmatter === 'meta') {
				pushMeta(chunk);
				continue;
			}
			if (isLikelyFalseHeading(chunk.text)) {
				const chapter = extractLeadingChapterMarker(chunk.text);
				const isFirstPara = !firstParaAssigned;
				firstParaAssigned = true;
				items.push({
					kind: 'para',
					chunkId: chunk.id,
					page: chunk.page,
					mood: chunk.mood,
					cues: chunk.cues,
					text: chapter ? chapter.rest : chunk.text,
					verse: false,
					chapterMarker: chapter?.marker,
					paraIndex: totalParas,
					isFirstPara,
				});
				totalParas += 1;
				continue;
			}
			items.push({
				kind: 'heading',
				chunkId: chunk.id,
				page: chunk.page,
				text: chunk.text,
				level: inferHeadingLevel(chunk),
				...(chunk.align ? { align: chunk.align } : {}),
			});
			continue;
		}

		if (chunk.type === 'quote') {
			const runs = chunk.runs && chunk.runs.length > 0 ? chunk.runs : undefined;
			items.push({
				kind: 'quote',
				chunkId: chunk.id,
				page: chunk.page,
				mood: chunk.mood,
				cues: chunk.cues,
				text: chunk.text,
				...(runs ? { runs } : {}),
				paraIndex: totalParas,
			});
			totalParas += 1;
			continue;
		}

		if (chunk.type === 'list') {
			const sourceItems =
				chunk.items && chunk.items.length > 0 ? chunk.items : chunk.text.split('\n');
			const listItems = sourceItems
				.map(normalizeListItemText)
				.filter((value) => value.length > 0);
			if (listItems.length === 0) continue;
			items.push({
				kind: 'list',
				chunkId: chunk.id,
				page: chunk.page,
				mood: chunk.mood,
				cues: chunk.cues,
				ordered: Boolean(chunk.ordered),
				items: listItems,
				paraIndex: totalParas,
			});
			totalParas += 1;
			continue;
		}

		if (chunk.type === 'code') {
			items.push({
				kind: 'code',
				chunkId: chunk.id,
				page: chunk.page,
				mood: chunk.mood,
				cues: chunk.cues,
				text: chunk.text,
				paraIndex: totalParas,
			});
			totalParas += 1;
			continue;
		}

		if (chunk.type === 'caption') {
			items.push({ kind: 'caption', chunkId: chunk.id, page: chunk.page, text: chunk.text });
			continue;
		}

		if (chunk.type === 'dedication') {
			items.push({ kind: 'dedication', chunkId: chunk.id, page: chunk.page, text: chunk.text });
			continue;
		}

		if (chunk.type === 'meta') {
			pushMeta(chunk);
			continue;
		}

		const isVerse = chunk.type === 'verse';
		const chapter = !isVerse ? extractLeadingChapterMarker(chunk.text) : null;
		const isFirstPara = !firstParaAssigned && !isVerse;
		if (!isVerse) {
			firstParaAssigned = true;
		}
		const runs = chunk.runs && chunk.runs.length > 0 ? chunk.runs : undefined;
		items.push({
			kind: 'para',
			chunkId: chunk.id,
			page: chunk.page,
			mood: chunk.mood,
			cues: chunk.cues,
			text: chapter ? chapter.rest : chunk.text,
			verse: isVerse,
			chapterMarker: chapter?.marker,
			paraIndex: totalParas,
			isFirstPara,
			...(runs ? { runs } : {}),
		});
		totalParas += 1;
	}

	flushPendingTocHeading();

	return { items, totalParas };
}

export function computeInitialRenderWindow(
	totalItems: number,
	targetIndex: number,
	batchSize = 60,
): { start: number; end: number } {
	if (totalItems <= 0) return { start: 0, end: 0 };
	const safeBatch = Math.max(10, batchSize);
	const clampedTarget = Math.min(totalItems - 1, Math.max(0, targetIndex));
	if (clampedTarget <= safeBatch * 2) {
		return {
			start: 0,
			end: Math.min(totalItems, Math.max(safeBatch, clampedTarget + Math.ceil(safeBatch * 0.6))),
		};
	}
	const start = Math.max(0, clampedTarget - Math.floor(safeBatch * 0.5));
	const end = Math.min(totalItems, clampedTarget + Math.ceil(safeBatch * 0.7));
	return { start, end };
}

export function findSavedProgressItemIndex(
	items: readonly BookDisplayItem[],
	progress?: { chunkId?: string; page?: number } | null,
): number {
	if (items.length === 0 || !progress) return 0;
	if (progress.chunkId) {
		const byChunk = items.findIndex((item) =>
			item.kind === 'toc'
				? item.chunkId === progress.chunkId || item.chunkIds.includes(progress.chunkId!)
				: item.chunkId === progress.chunkId,
		);
		if (byChunk >= 0) return byChunk;
	}
	if (progress.page && progress.page > 1) {
		const byPage = items.findIndex((item) => item.page >= progress.page!);
		if (byPage >= 0) return byPage;
	}
	return 0;
}

function normalizeJumpTargetText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[·]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function findTocJumpTargetIndex(
	items: readonly BookDisplayItem[],
	targetLabel: string,
	targetPage: number,
): number | null {
	if (items.length === 0) return null;
	const cleanTarget = normalizeJumpTargetText(targetLabel);

	if (cleanTarget) {
		const headingMatch = items.findIndex((item) => {
			if (item.kind !== 'heading' && item.kind !== 'opener' && !(item.kind === 'para' && item.chapterMarker)) {
				return false;
			}
			const raw =
				item.kind === 'heading'
					? item.text
					: item.kind === 'opener'
						? item.title
						: item.chapterMarker ?? '';
			const candidate = normalizeJumpTargetText(raw);
			if (!candidate) return false;
			if (candidate === cleanTarget) return true;
			if (cleanTarget.length >= 4 && candidate.length >= 4) {
				return candidate.includes(cleanTarget) || cleanTarget.includes(candidate);
			}
			const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`).test(candidate);
		});
		if (headingMatch >= 0) return headingMatch;

		if (cleanTarget.length >= 4) {
			const paraMatch = items.findIndex((item) => {
				if (item.kind === 'toc' || item.kind === 'opener') return false;
				return normalizeJumpTargetText(displayItemPlainText(item)).startsWith(cleanTarget);
			});
			if (paraMatch >= 0) return paraMatch;
		}
	}

	if (targetPage > 0) {
		const exactPage = items.findIndex((item) => item.kind !== 'toc' && item.page === targetPage);
		if (exactPage >= 0) return exactPage;
		const nextPage = items.findIndex((item) => item.kind !== 'toc' && item.page >= targetPage);
		if (nextPage >= 0) return nextPage;
		for (let i = items.length - 1; i >= 0; i -= 1) {
			if (items[i].kind !== 'toc') return i;
		}
	}

	return null;
}

export function findKeywordJumpTargetIndex(
	items: readonly BookDisplayItem[],
	term: string,
	anchor?: string,
): number | null {
	if (items.length === 0) return null;
	if (anchor) {
		const byAnchor = items.findIndex((item) =>
			item.kind === 'toc'
				? item.chunkId === anchor || item.chunkIds.includes(anchor)
				: item.chunkId === anchor,
		);
		if (byAnchor >= 0) return byAnchor;
	}
	const cleanTerm = term.trim().toLowerCase();
	if (!cleanTerm) return null;
	const byText = items.findIndex((item) => {
		if (item.kind === 'toc') {
			return item.parsed.entries.some((e) => e.label.toLowerCase().includes(cleanTerm));
		}
		if (item.kind === 'opener') {
			return item.title.toLowerCase().includes(cleanTerm);
		}
		return displayItemPlainText(item).toLowerCase().includes(cleanTerm);
	});
	return byText >= 0 ? byText : null;
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
