import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJson } from '../../../shared/api/http';
import { fetchProjectsPage } from './projects';

/**
 * Paginated projects read (issue 47 S3/S8): the envelope items go through the
 * same card mapping as the array loader, and `total` feeds the landing cap.
 */

vi.mock('../../../shared/api/http', () => ({ getJson: vi.fn() }));

const getJsonMock = vi.mocked(getJson);

const row = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	url: 'https://github.com/example/app',
	name: 'App',
	description: 'Un proyecto',
	githubUrl: null,
	technologies: ['node'],
	icon: null,
	tagline: null,
	status: null,
	featured: false,
	forSale: false,
	...overrides,
});

beforeEach(() => {
	getJsonMock.mockReset();
});

describe('fetchProjectsPage — paginated envelope', () => {
	it('requests the window and maps the cards', async () => {
		getJsonMock.mockResolvedValue({
			items: [row({ id: 7, name: 'API' })],
			total: 5,
			offset: 0,
			limit: 4,
		});

		const page = await fetchProjectsPage('https://example.test', 0, 4);

		expect(getJsonMock).toHaveBeenCalledWith('/projects?offset=0&limit=4', { serverOrigin: 'https://example.test' });
		expect(page?.total).toBe(5);
		expect(page?.items[0]).toEqual({
			name: 'API',
			icon: 'wrench',
			tagline: '',
			description: 'Un proyecto',
			stack: ['node'],
			status: 'en-construccion',
			statusLabel: 'En construcción',
			repoUrl: 'https://github.com/example/app',
			demoUrl: 'https://github.com/example/app',
			featured: false,
			forSale: false,
		});
	});

	it('answers null when the read itself fails', async () => {
		getJsonMock.mockRejectedValue(new Error('No se pudo conectar con el servidor.'));

		await expect(fetchProjectsPage(undefined, 0, 4)).resolves.toBeNull();
	});
});
