import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJson } from '../../../shared/api/http';
import { fetchCertificates, fetchCertificatesPage, formatCertificateDate } from './certificates';

/**
 * The landing loader (specs S3/S5/S6): it keeps the order the API answers,
 * maps every public field and only lets the card render an image the browser
 * can actually load — a stored path nothing serves must not become a broken
 * placeholder.
 */

vi.mock('../../../shared/api/http', () => ({ getJson: vi.fn() }));

const getJsonMock = vi.mocked(getJson);

const row = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	image: null,
	title: 'Certificado',
	description: 'Una descripción',
	issuerLink: 'https://coursera.org',
	date: '2024-03-15',
	...overrides,
});

beforeEach(() => {
	getJsonMock.mockReset();
});

describe('fetchCertificates — public mapping', () => {
	it('reads /certificates and keeps the order the API answered', async () => {
		getJsonMock.mockResolvedValue([
			row({ id: 9, title: 'Reciente', date: '2024-05-01' }),
			row({ id: 4, title: 'Antiguo', date: '2022-01-10' }),
		]);

		const certificates = await fetchCertificates('https://personal-page.ezedelebecq22.workers.dev');

		expect(getJsonMock).toHaveBeenCalledWith('/certificates', { serverOrigin: 'https://personal-page.ezedelebecq22.workers.dev' });
		expect(certificates?.map((certificate) => certificate.id)).toEqual([9, 4]);
		expect(certificates?.[0]).toEqual({
			id: 9,
			image: undefined,
			title: 'Reciente',
			description: 'Una descripción',
			issuerLink: 'https://coursera.org',
			date: '2024-05-01',
		});
	});

	it('keeps only images the browser can load', async () => {
		getJsonMock.mockResolvedValue([
			row({ id: 1, image: 'https://cdn.example/certificado.png' }),
			row({ id: 2, image: '/uploads/certificates/certificado.webp' }),
			row({ id: 3, image: 'uploads/certificates/certificado.png' }),
			row({ id: 4, image: '' }),
			row({ id: 5, image: null }),
			row({ id: 6, image: 'javascript:alert(1)' }),
			row({ id: 7, image: '//evil.example/certificado.png' }),
		]);

		const certificates = await fetchCertificates();

		expect(certificates?.map((certificate) => certificate.image)).toEqual([
			'https://cdn.example/certificado.png',
			'/uploads/certificates/certificado.webp',
			'/api/certificates/3/image',
			undefined,
			undefined,
			undefined,
			undefined,
		]);
	});

	it('drops an issuer link that is not an http(s) URL', async () => {
		getJsonMock.mockResolvedValue([row({ issuerLink: 'javascript:alert(1)' }), row({ id: 2, issuerLink: '' })]);

		const certificates = await fetchCertificates();

		expect(certificates?.map((certificate) => certificate.issuerLink)).toEqual(['', '']);
	});

	it('answers null when the read itself fails, so the widget keeps its fallback', async () => {
		getJsonMock.mockRejectedValue(new Error('No se pudo conectar con el servidor.'));

		await expect(fetchCertificates()).resolves.toBeNull();
	});
});

describe('fetchCertificatesPage — paginated envelope (issue 47 S3/S8)', () => {
	it('requests the offset/limit window and maps the envelope items', async () => {
		getJsonMock.mockResolvedValue({
			items: [row({ id: 9 }), row({ id: 4 })],
			total: 6,
			offset: 0,
			limit: 4,
		});

		const page = await fetchCertificatesPage('https://example.test', 0, 4);

		expect(getJsonMock).toHaveBeenCalledWith('/certificates?offset=0&limit=4', { serverOrigin: 'https://example.test' });
		expect(page).toEqual({
			items: [
				expect.objectContaining({ id: 9 }),
				expect.objectContaining({ id: 4 }),
			],
			total: 6,
			offset: 0,
			limit: 4,
		});
	});

	it('exposes total so the landing can hide «Ver todos» when nothing is left', async () => {
		getJsonMock.mockResolvedValue({ items: [row()], total: 1, offset: 0, limit: 4 });

		const page = await fetchCertificatesPage(undefined, 0, 4);

		expect(page?.total).toBe(1);
		expect(page?.items).toHaveLength(1);
	});

	it('answers null when the read itself fails, the same contract as the array loader', async () => {
		getJsonMock.mockRejectedValue(new Error('No se pudo conectar con el servidor.'));

		await expect(fetchCertificatesPage(undefined, 0, 4)).resolves.toBeNull();
	});
});

describe('formatCertificateDate — the date line of the card', () => {
	it.each([
		['2024-03-15', 'marzo de 2024'],
		['2022-12-01', 'diciembre de 2022'],
		['2024-13-01', '2024-13-01'],
		['', ''],
	])('%s → %s', (value, expected) => {
		expect(formatCertificateDate(value)).toBe(expected);
	});
});
