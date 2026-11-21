// Public entry of the reading engine. The implementation lives in the sibling
// modules below; this file only re-exports so callers keep importing from
// `features/book/lib/reader`.

export {
	removeMarkFromState,
	removeWordFromState,
	resolveAutoBookStatus,
	resolvePreferredReadingState,
	type StoredReadingSnapshot,
} from './state';
export {
	parseTocChunk,
	type ParseTocOptions,
	type ParsedToc,
	type TocEntry,
} from './toc';
export { splitLeaderlessNumberedToc } from './tocLines';
export {
	classifyFrontmatterHeading,
	extractLeadingChapterMarker,
	inferHeadingLevel,
	isLikelyFalseHeading,
	parseBookOpenerHeading,
	type BookOpenerHeading,
} from './headings';
export {
	collectRepeatedEdgeNoise,
	isNoiseChunk,
	normalizeEdgeNoiseKey,
	type ReaderDisplayContext,
} from './noise';
export { stripInlineArtifacts } from './textNormalize';
export {
	prepareChunkDisplay,
	type BookDisplayItem,
	type ChunkDisplay,
	type PreparedBookDisplay,
} from './displayModel';
export { prepareBookDisplayItems } from './displayItems';
export {
	computeInitialRenderWindow,
	extractBookChapters,
	findActiveChapterIndex,
	findAdjacentChapterIndex,
	findKeywordJumpTargetIndex,
	findSavedProgressItemIndex,
	findTocJumpTargetIndex,
	type ChapterNavItem,
} from './navigation';
export {
	clampReaderScale,
	clusterVisualLineTops,
	computeDampedWheelDelta,
	computeFovealBandMetrics,
	DEFAULT_READER_PREFS,
	findAdjacentLineTop,
	parseReaderPrefs,
	stepReaderScale,
	type ReaderAlign,
	type ReaderFocusMode,
	type ReaderFont,
	type ReaderPrefs,
} from './prefs';
export {
	buildTimerSummary,
	clampTimerMinutes,
	createIdleTimerSession,
	createTimerSession,
	DEFAULT_TIMER_MINUTES,
	evaluateTimerTick,
	formatTimerClock,
	isNavigationLocked,
	MAX_TIMER_MINUTES,
	MIN_TIMER_MINUTES,
	parseChimeMuted,
	parseCompletedTimersCount,
	parseLastTimerMinutes,
	parsePersistedTimerSession,
	pauseTimerSession,
	resumeTimerSession,
	serializeTimerSession,
	TIMER_PRESET_MINUTES,
	type ReadingLockTimer,
	type ReadingLockTimerStatus,
	type TimerSessionMeta,
	type TimerSessionSummary,
} from './timers';
