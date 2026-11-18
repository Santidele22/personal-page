import type { ReadingChunk } from '../../../entities/book/types';

import {
	normalizeListItemText,
	prepareChunkText,
	type BookDisplayItem,
	type PreparedBookDisplay,
} from './displayModel';
import {
	flushPendingTocHeading,
	pushMetaItem,
	pushTocItem,
	type TocQueueState,
} from './displayQueue';
import {
	classifyFrontmatterHeading,
	extractLeadingChapterMarker,
	inferHeadingLevel,
	isLikelyFalseHeading,
	parseBookOpenerHeading,
} from './headings';
import { collectRepeatedEdgeNoise, isNoiseChunk, type ReaderDisplayContext } from './noise';
import { parseTocChunk } from './toc';
import {
	collectLegacySectionTocs,
	extractStandaloneTocHeading,
	isStandaloneTocHeading,
	lineMatchesExplicitLeaderOrGap,
} from './tocLines';


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

	const tocState: TocQueueState = {};

	// Legacy v1 cache rescue: a numbered section heading (`1.1`) followed by a
	// leaderless TOC block (`¿QUÉ ES ...? 3 1.1.1 ... 4`) was extracted as a
	// heading + paragraph pair. Rebuild the hierarchical TOC rows instead.
	const { rescuedTocEntries, consumedHeadingIds } = collectLegacySectionTocs(activeChunks);

	for (let i = 0; i < activeChunks.length; i += 1) {
		const chunk = activeChunks[i];

		if (consumedHeadingIds.has(chunk.id)) continue;
		const rescuedEntries = rescuedTocEntries.get(chunk.id);
		if (rescuedEntries) {
			pushTocItem(items, chunk, { entries: rescuedEntries.map((entry) => ({ ...entry })) }, tocState);
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
				tocState.pendingTocHeading = {
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
				pushTocItem(items, chunk, parsedToc, tocState);
				inTocContext = true;
				continue;
			}
		}

		flushPendingTocHeading(items, tocState);
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
				pushMetaItem(items, chunk);
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
			pushMetaItem(items, chunk);
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

	flushPendingTocHeading(items, tocState);

	return { items, totalParas };
}
