import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJson } from '../../../shared/api/http';
import {
	getJson as authorizedGetJson,
	putJson as authorizedPutJson,
} from '../../../shared/api/authorizedHttp';
import {
	fetchBookById,
	fetchBookClientReading,
	fetchBookReading,
	fetchBookReadingState,
	fetchBooks,
	fetchBooksPage,
	saveBookReadingState,
} from './books';

/**
 * The reading loaders (issue 47 S5): the array read keeps filtering
 * `published === true` client-side; the paginated read asks the backend for
 * the same filter so a server-side `limit` window only counts published
 * books. Both share the card mapping.
 */

vi.mock('../../../shared/api/http', () => ({ getJson: vi.fn(), putJson: vi.fn() }));
vi.mock('../../../shared/api/authorizedHttp', () => ({ getJson: vi.fn(), putJson: vi.fn() }));

const getJsonMock = vi.mocked(getJson);
const authorizedGetJsonMock = vi.mocked(authorizedGetJson);
const authorizedPutJsonMock = vi.mocked(authorizedPutJson);

const row = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	title: 'Clean Code',
	author: 'Robert C. Martin',
	description: 'Un clásico',
	status: 'finished',
	kind: 'tecnico',
	review: null,
	published: true,
	...overrides,
});

beforeEach(() => {
	getJsonMock.mockReset();
	authorizedGetJsonMock.mockReset();
	authorizedPutJsonMock.mockReset();
});

describe('fetchBooksPage — paginated envelope with the published filter', () => {
	it('requests the window with published=true and maps the envelope', async () => {
		getJsonMock.mockResolvedValue({
			items: [row({ id: 2 }), row({ id: 5, status: 'reading' })],
			total: 2,
			offset: 0,
			limit: 4,
		});

		const page = await fetchBooksPage('https://example.test', 0, 4, true);

		expect(getJsonMock).toHaveBeenCalledWith('/books?offset=0&limit=4&published=true', { serverOrigin: 'https://example.test' });
		expect(page?.total).toBe(2);
		expect(page?.items.map((book) => book.id)).toEqual([2, 5]);
		expect(page?.items[0]).toEqual({
			id: 2,
			title: 'Clean Code',
			author: 'Robert C. Martin',
			description: 'Un clásico',
			status: 'finished',
			statusLabel: 'Terminado',
			kind: 'tecnico',
			review: undefined,
			published: true,
		});
	});

	it('keeps the published flag out of the query when the caller does not set it', async () => {
		getJsonMock.mockResolvedValue({ items: [], total: 0, offset: 8, limit: 4 });

		await fetchBooksPage(undefined, 8, 4);

		expect(getJsonMock).toHaveBeenCalledWith('/books?offset=8&limit=4', { serverOrigin: undefined });
	});

	it('adds the kind filter to the window query when the caller sets it', async () => {
		getJsonMock.mockResolvedValue({ items: [], total: 0, offset: 0, limit: 4 });

		await fetchBooksPage('https://example.test', 0, 4, true, 'tecnico');

		expect(getJsonMock).toHaveBeenCalledWith('/books?offset=0&limit=4&published=true&kind=tecnico', {
			serverOrigin: 'https://example.test',
		});
	});

	it('answers null when the read itself fails', async () => {
		getJsonMock.mockRejectedValue(new Error('No se pudo conectar con el servidor.'));

		await expect(fetchBooksPage(undefined, 0, 4, true)).resolves.toBeNull();
	});
});

describe('fetchBooks — array read keeps the client-side published filter', () => {
	it('drops unpublished rows from the plain array response', async () => {
		getJsonMock.mockResolvedValue([row({ id: 1, published: true }), row({ id: 2, published: false })]);

		const books = await fetchBooks();

		expect(books?.map((book) => book.id)).toEqual([1]);
	});
});

describe('immersive reader API helpers (issue 50)', () => {
	it('fetchBookById returns mapped book only when published', async () => {
		getJsonMock.mockResolvedValueOnce(row({ id: 7, published: true }));
		const book = await fetchBookById(7, 'https://example.test');
		expect(book?.id).toBe(7);

		getJsonMock.mockResolvedValueOnce(row({ id: 8, published: false }));
		const unpublished = await fetchBookById(8, 'https://example.test');
		expect(unpublished).toBeNull();
	});

	it('fetches reading.json and reading-state and saves reading-state via PUT', async () => {
		const doc = {
			bookId: '7',
			pdfPages: 312,
			ocrPending: false,
			chunks: [
				{
					id: 'p0118.0340',
					type: 'para' as const,
					page: 118,
					offset: 340,
					text: 'Drogo contemplaba la llanura.',
					mood: 'espera' as const,
					cues: ['llanura', 'espera'],
				},
			],
		};
		getJsonMock.mockResolvedValueOnce(doc);
		await expect(fetchBookReading(7, { serverOrigin: 'https://example.test', bearerToken: 'jwt-1' })).resolves.toEqual(doc);
		expect(getJsonMock).toHaveBeenCalledWith('/books/7/reading', {
			serverOrigin: 'https://example.test',
			bearerToken: 'jwt-1',
		});

		const state = {
			bookId: '7',
			marks: [],
			words: [{ term: 'relevos' }],
			progress: { page: 118, pct: 38 },
		};
		getJsonMock.mockResolvedValueOnce(state);
		await expect(fetchBookReadingState(7, { serverOrigin: 'https://example.test', cookie: 's=1' })).resolves.toEqual(state);
		expect(getJsonMock).toHaveBeenCalledWith('/books/7/reading-state', {
			serverOrigin: 'https://example.test',
			cookie: 's=1',
		});

		authorizedPutJsonMock.mockResolvedValueOnce();
		await saveBookReadingState(7, { progress: { page: 120, pct: 40 } });
		expect(authorizedPutJsonMock).toHaveBeenCalledWith('/books/7/reading-state', {
			progress: { page: 120, pct: 40 },
		});
	});

	it('fetchBookClientReading uses authorizedHttp.getJson so browser reads carry bearer/cookies', async () => {
		const doc = { bookId: '7', pdfPages: 120, ocrPending: false, chunks: [] };
		authorizedGetJsonMock.mockResolvedValueOnce(doc);
		await expect(fetchBookClientReading(7)).resolves.toEqual(doc);
		expect(authorizedGetJsonMock).toHaveBeenCalledWith('/books/7/reading');
	});
});
