import type { Book, ReadingStatus } from '../../../entities/book/types';
import { booksFallback } from '../../../entities/book/data';
import { getJson } from '../../../shared/api/http';

const READING_STATUSES: ReadingStatus[] = ['reading', 'finished', 'queued'];

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
export async function fetchBooks(serverOrigin?: string): Promise<Book[] | null> {
	try {
		const rows = await getJson<ApiBook[]>('/books', { serverOrigin });

		return rows
			.filter((book) => book.published === true)
			.map((book) => {
				const status = READING_STATUSES.includes(book.status as ReadingStatus)
					? (book.status as ReadingStatus)
					: 'queued';

				return {
					id: book.id,
					title: book.title,
					author: book.author,
					description: book.description,
					status,
					statusLabel: STATUS_LABELS[status],
					review: book.review ?? undefined,
					published: true,
				};
			});
	} catch {
		return null;
	}
}

export { booksFallback };
