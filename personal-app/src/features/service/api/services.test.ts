import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJson } from '../../../shared/api/http';
import { fetchServicesPage } from './services';

/**
 * Paginated services read (issue 47 S3/S8): the envelope items go through the
 * same card mapping as the array loader (including the positional card
 * number), and `total` feeds the landing cap.
 */

vi.mock('../../../shared/api/http', () => ({ getJson: vi.fn() }));

const getJsonMock = vi.mocked(getJson);

const row = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	name: 'Mentoría',
	description: 'Acompañamiento',
	features: ['sesiones', 'revisiones'],
	price: 120,
	icon: null,
	priceLabel: null,
	...overrides,
});

beforeEach(() => {
	getJsonMock.mockReset();
});

describe('fetchServicesPage — paginated envelope', () => {
	it('requests the window and maps the cards with their positional number', async () => {
		getJsonMock.mockResolvedValue({
			items: [row(), row({ id: 2, name: 'Auditoría' })],
			total: 6,
			offset: 0,
			limit: 4,
		});

		const page = await fetchServicesPage('https://example.test', 0, 4);

		expect(getJsonMock).toHaveBeenCalledWith('/services?offset=0&limit=4', { serverOrigin: 'https://example.test' });
		expect(page?.total).toBe(6);
		expect(page?.items.map((service) => service.num)).toEqual(['01', '02']);
		expect(page?.items[0]).toEqual({
			num: '01',
			icon: 'pen-line',
			title: 'Mentoría',
			description: 'Acompañamiento',
			items: ['sesiones', 'revisiones'],
			price: 'USD 120',
		});
	});

	it('answers null when the read itself fails', async () => {
		getJsonMock.mockRejectedValue(new Error('No se pudo conectar con el servidor.'));

		await expect(fetchServicesPage(undefined, 0, 4)).resolves.toBeNull();
	});
});
