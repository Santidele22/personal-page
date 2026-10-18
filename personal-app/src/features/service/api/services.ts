import type { Service, ServiceIcon } from '../../../entities/service/types';
import { services } from '../../../entities/service/data';
import { getJson } from '../../../shared/api/http';

const SERVICE_ICONS: ServiceIcon[] = ['pen-line', 'handshake', 'graduation-cap'];

/**
 * A service row as `GET /services` serves it: the editable body plus the
 * optional portada card columns the landing renders (`icon`, `priceLabel`).
 */
type ApiServiceCard = {
	id: number;
	name: string;
	description: string;
	features: string[];
	price: number;
	icon?: string | null;
	priceLabel?: string | null;
};

/**
 * The services cards (`widgets/services/Services.astro`). `null` only means
 * the request itself failed (API down, proxy misconfigured, server without the
 * backend): the widget then renders the values the block shipped with, exactly
 * like the profile loader. Empty storage answers `[]`: the admin chose to show
 * no services, so the section renders without cards.
 */
export async function fetchServices(serverOrigin?: string): Promise<Service[] | null> {
	try {
		const rows = await getJson<ApiServiceCard[]>('/services', { serverOrigin });

		return rows.map((service, index) => ({
			// The card number is its position in the list, not a stored column.
			num: String(index + 1).padStart(2, '0'),
			icon: SERVICE_ICONS.includes(service.icon as ServiceIcon)
				? (service.icon as ServiceIcon)
				: 'pen-line',
			title: service.name,
			description: service.description,
			items: service.features,
			price: service.priceLabel ?? `USD ${service.price}`,
		}));
	} catch {
		return null;
	}
}

export { services as servicesFallback };
