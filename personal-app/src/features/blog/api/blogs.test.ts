import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJson } from '../../../shared/api/http';
import { fetchBlogPage } from './blogs';

/**
 * Paginated archive read (issue 47 S9): the backend owns the order (newest
 * `pubDate` first), so the envelope is returned as it arrives — re-sorting a
 * single page client-side would scramble the cross-page order.
 */

vi.mock('../../../shared/api/http', () => ({ getJson: vi.fn() }));

const getJsonMock = vi.mocked(getJson);

beforeEach(() => {
	getJsonMock.mockReset();
});

describe('fetchBlogPage — paginated archive envelope', () => {
	it('requests the offset/limit window and keeps the API order', async () => {
		const envelope = {
			items: [
				{ id: 3, slug: 'vieja', pubDate: '2024-01-01' },
				{ id: 1, slug: 'nueva', pubDate: '2026-01-01' },
			],
			total: 12,
			offset: 10,
			limit: 2,
		};
		getJsonMock.mockResolvedValue(envelope);

		const page = await fetchBlogPage('https://example.test', 10, 2);

		expect(getJsonMock).toHaveBeenCalledWith('/blogs?offset=10&limit=2', { serverOrigin: 'https://example.test' });
		expect(page).toEqual(envelope);
		expect(page?.items.map((row) => row.slug)).toEqual(['vieja', 'nueva']);
	});

	it('answers null when the read itself fails', async () => {
		getJsonMock.mockRejectedValue(new Error('No se pudo conectar con el servidor.'));

		await expect(fetchBlogPage(undefined, 0, 10)).resolves.toBeNull();
	});
});
