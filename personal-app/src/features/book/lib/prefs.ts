// Reader preferences, foveal focus band and scroll damping metrics.

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
