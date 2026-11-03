import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJson } from '../../../shared/api/http';
import { fetchBooks, fetchBooksPage } from './books';

/**
 * The reading loaders (issue 47 S5): the array read keeps filtering
 * `published === true` client-side; the paginated read asks the backend for
 * the same filter so a server-side `limit` window only counts published
 * books. Both share the card mapping.
 */

vi.mock('../../../shared/api/http', () => ({ getJson: vi.fn() }));

const getJsonMock = vi.mocked(getJson);

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
