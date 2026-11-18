import type { ReadingChunk } from '../../../entities/book/types';

import { stripInlineArtifacts } from './textNormalize';
import type { TocEntry } from './toc';

export const TOC_LEADER_RE =
	/(?:\.(?:[ \t]*\.){1,}|[-–—_·•](?:[ \t]*[-–—_·•]){1,}|[ \t]+[-–—·.][ \t]+)[ \t]*(\d{1,4}|[ivxlcdm]{1,7})(?=\s|$)/gi;
export const TOC_TAB_OR_MULTISPACE_RE =
	/^(.+?)(?:\t+|[ ]{2,})(\d{1,4}|[ivxlcdm]{1,7})\s*$/i;
export const TOC_SINGLE_SPACE_RE = /^(.+?)[ ]+(\d{1,4})\s*$/;
export const TOC_PAGE_FIRST_RE =
	/^(\d{1,4})(?:\t+|[ ]{2,}|[ \t]*[·|–—-][ \t]*)([A-ZÁÉÍÓÚÜÑ¿¡«"0-9].{1,140})$/;
export const TOC_HEADING_PREFIX_RE =
	/^(Índice(?:\s+general|\s+de\s+contenidos)?|Indice(?:\s+general|\s+de\s+contenidos)?|Tabla de contenidos|Contenidos?|Sumario|Index|Table of contents|Contents)(?:\s*[:\-–—]?\s+|\s*$)/i;
export const TOC_STANDALONE_HEADING_RE =
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

export function parseTocPageToken(raw: string): { page: number; pageLabel?: string } | null {
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

export function cleanTocLabel(raw: string): string {
	return stripInlineArtifacts(raw)
		.replace(/(?:\s*[.\-–—_·•])+\s*$/, '')
		.replace(/^(?:\s*[.\-–—_·•])+\s*/, '')
		.replace(/\s+/g, ' ')
		.trim();
}

const LEADERLESS_SECTION_NUMBER_RE = /(?:^|\s)\d+\.\d+(?:\.\d+)*\s/;
const LEADERLESS_TOC_SPLIT_RE =
	/\s(\d{1,4})(?=\s+(?:\d+\.\d+(?:\.\d+)*\s|[A-ZÁÉÍÓÚÜÑ¿¡«"])|\s*$)/g;
export const GLUED_TOC_ENTRY_RE = /\s\d{1,4}\s+(?:\d+\.\d+(?:\.\d+)*\s|[A-ZÁÉÍÓÚÜÑ¿¡«"])/;

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
export function withTocLevel(entry: TocEntry): TocEntry {
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

export function isStandaloneTocHeading(text: string): boolean {
	return TOC_STANDALONE_HEADING_RE.test(text.trim());
}

export function extractStandaloneTocHeading(text: string): string {
	const match = text.trim().match(TOC_HEADING_PREFIX_RE);
	return match ? match[1].trim() : text.trim();
}

export function isLikelyYearOnlySet(entries: readonly TocEntry[]): boolean {
	return entries.length > 0 && entries.every((e) => !e.pageLabel && e.page >= 1800 && e.page <= 2100);
}

export function lineMatchesExplicitLeaderOrGap(line: string): boolean {
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

export function coalesceWrappedTocLines(
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
 * Legacy v1 cache rescue: a numbered section heading (`1.1`) followed by a
 * leaderless TOC block was extracted as a heading + paragraph pair. Rebuilds
 * the hierarchical TOC rows keyed by the body chunk id, plus the heading chunk
 * ids the rescue consumed.
 */
export function collectLegacySectionTocs(activeChunks: readonly ReadingChunk[]): {
	rescuedTocEntries: Map<string, TocEntry[]>;
	consumedHeadingIds: Set<string>;
} {
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
	return { rescuedTocEntries, consumedHeadingIds };
}
