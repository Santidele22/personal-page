import type { ReadingChunkType } from '../../../entities/book/types';

import {
	GLUED_TOC_ENTRY_RE,
	TOC_HEADING_PREFIX_RE,
	TOC_LEADER_RE,
	TOC_PAGE_FIRST_RE,
	TOC_SINGLE_SPACE_RE,
	TOC_TAB_OR_MULTISPACE_RE,
	cleanTocLabel,
	coalesceWrappedTocLines,
	extractStandaloneTocHeading,
	isLikelyYearOnlySet,
	isStandaloneTocHeading,
	lineMatchesExplicitLeaderOrGap,
	parseTocPageToken,
	splitLeaderlessNumberedToc,
	withTocLevel,
} from './tocLines';

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
