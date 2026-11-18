import type {
	BookReadingState,
	ReadingMark,
	ReadingStatus,
	ReadingWord,
} from '../../../entities/book/types';

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

export function resolveAutoBookStatus(
	currentStatus: ReadingStatus | '' | null | undefined,
	pct: number,
	started = true,
): ReadingStatus | null {
	const cleanPct = Number.isFinite(pct) ? pct : 0;
	if (cleanPct >= 100) {
		return currentStatus === 'finished' ? null : 'finished';
	}
	if (started && currentStatus === 'queued') {
		return 'reading';
	}
	return null;
}
