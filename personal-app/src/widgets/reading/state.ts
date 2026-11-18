import type { BookReadingState } from '../../entities/book/types';
import { resolvePreferredReadingState } from '../../features/book/lib/reader';
import { body } from './dom';

// Book identity and the reading state the page server-rendered into the DOM.
const hasBook = body.dataset.hasBook === '1';
const bookId = Number(body.dataset.bookId || 0);
const bookTitle = body.dataset.bookTitle || '';
const bookAuthor = body.dataset.bookAuthor || '';
const downloadUrl = body.dataset.downloadUrl || `/api/books/${bookId}/download`;
let pdfPages = Math.max(1, Number(body.dataset.pdfPages || 1));
let parsedInitial: Partial<BookReadingState> = {};
try {
	parsedInitial = JSON.parse(body.dataset.initialState || '{}') as Partial<BookReadingState>;
} catch {}

const storageKey = `vigilia:book:${bookId}`;
const baseState: BookReadingState = {
	bookId: String(bookId),
	marks: Array.isArray(parsedInitial.marks) ? [...parsedInitial.marks] : [],
	words: Array.isArray(parsedInitial.words) ? [...parsedInitial.words] : [],
	progress: parsedInitial.progress ?? { page: 1, pct: 0 },
};

let localRaw: string | null = null;
try {
	localRaw = localStorage.getItem(storageKey);
} catch {}
const state: BookReadingState = resolvePreferredReadingState(baseState, localRaw);

function writeLocalSnapshot() {
	try {
		localStorage.setItem(
			storageKey,
			JSON.stringify({
				...state,
				updatedAt: Date.now(),
			}),
		);
	} catch {}
}

export function getPdfPages(): number {
	return pdfPages;
}

export function setPdfPages(next: number): void {
	pdfPages = next;
}

export { state, writeLocalSnapshot, hasBook, bookId, bookTitle, bookAuthor, downloadUrl };
