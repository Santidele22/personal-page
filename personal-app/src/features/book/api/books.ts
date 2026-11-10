import type { Book, BookKind, ReadingStatus } from '../../../entities/book/types';
import { getJson } from '../../../shared/api/http';
import type { Paged } from '../../../shared/api/pagination';

const READING_STATUSES: ReadingStatus[] = ['reading', 'finished', 'queued'];
const BOOK_KINDS: BookKind[] = ['tecnico', 'no_tecnico'];

/** Rendered label of each stored reading status key. */
const STATUS_LABELS: Record<ReadingStatus, string> = {
	reading: 'Leyendo',
	finished: 'Terminado',
	queued: 'En cola',
};

/**
 * A book row as `GET /books` serves it: the editable body plus the upload
 * metadata and the publishing flag. The landing ignores the file columns, but
 * they arrive with the row and the type documents them.
 */
type ApiBook = {
	id: number;
	title: string;
	author: string;
	description: string;
	status?: string | null;
	kind?: string | null;
	review?: string | null;
	published?: boolean | null;
	originalName?: string | null;
	fileSize?: string | null;
	mimeType?: string | null;
	filePath?: string | null;
};

/**
 * The reading cards (`widgets/reading/Reading.astro`). `null` only means the
 * request itself failed (API down, proxy misconfigured, server without the
 * backend): the widget then renders the empty shelf it shipped with. The
 * public read filters `published === true`, so drafts stay out of the landing
 * the way the admin panel keeps them.
 */
function mapBook(book: ApiBook): Book {
	const status = READING_STATUSES.includes(book.status as ReadingStatus)
		? (book.status as ReadingStatus)
		: 'queued';
	const kind = BOOK_KINDS.includes(book.kind as BookKind)
		? (book.kind as BookKind)
		: 'no_tecnico';

	return {
		id: book.id,
		title: book.title,
		author: book.author,
		description: book.description,
		status,
		statusLabel: STATUS_LABELS[status],
		kind,
		review: book.review ?? undefined,
		published: true,
	};
}

export async function fetchBooks(serverOrigin?: string): Promise<Book[] | null> {
	try {
		const rows = await getJson<ApiBook[]>('/books', { serverOrigin });

		return rows
			.filter((book) => book.published === true)
			.map(mapBook);
	} catch {
		return null;
	}
}

/**
 * Paginated read (issue 47 S5): the optional `published=true` filter moves to
 * the backend so a server-side `limit` window only counts published books
 * (the landing caps this section to 4, S8). `null` means the request itself
 * failed, the same contract the array loader has.
 */
export async function fetchBooksPage(
	serverOrigin: string | undefined,
	offset: number | undefined,
	limit: number,
	published?: boolean,
): Promise<Paged<Book> | null> {
	try {
		const params = new URLSearchParams();
		if (offset !== undefined) params.set('offset', String(offset));
		if (limit !== undefined) params.set('limit', String(limit));
		if (published !== undefined) params.set('published', String(published));
		const query = params.toString();
		const page = await getJson<Paged<ApiBook>>(`/books${query ? `?${query}` : ''}`, { serverOrigin });
		return { ...page, items: page.items.map(mapBook) };
	} catch {
		return null;
	}
}
