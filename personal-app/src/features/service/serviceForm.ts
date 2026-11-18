import type { ServiceIcon } from '../../entities/service/types';
import type { AdminServiceRow, ServiceWriteBody } from './api/services-admin';

/**
 * Pure form helpers for the services admin panel: the editable shape, the
 * stored row ↔ form mappers, the icon catalogue, the label helpers and the
 * Spanish client-side validation. No DOM and no requests here.
 */

export type ServiceFormState = {
	name: string;
	description: string;
	/** One feature per line; the API stores the list. */
	features: string;
	/** Numeric text: the stored column is a number. */
	price: string;
	/** Icon key, empty when the card ships without one. */
	icon: string;
	priceLabel: string;
};

export const EMPTY_SERVICE_FORM: ServiceFormState = {
	name: '',
	description: '',
	features: '',
	price: '',
	icon: '',
	priceLabel: '',
};

/** The portada icons the admin can pick, with the labels it reads. */
export const SERVICE_ICON_OPTIONS: { value: ServiceIcon; label: string }[] = [
	{ value: 'pen-line', label: 'Lapicero' },
	{ value: 'handshake', label: 'Apretón de manos' },
	{ value: 'graduation-cap', label: 'Birrete' },
];

/** The values the API accepts in `icon`; anything else travels as `null`. */
const SERVICE_ICON_KEYS: string[] = SERVICE_ICON_OPTIONS.map((option) => option.value);

/** Stored row → editable form, the same mapping the profile editor uses. */
export function serviceToForm(row: AdminServiceRow): ServiceFormState {
	return {
		name: row.name,
		description: row.description,
		features: row.features.join('\n'),
		price: String(row.price),
		icon: row.icon ?? '',
		priceLabel: row.priceLabel ?? '',
	};
}

/** Textarea text → list, dropping the blank lines used as separators. */
export function serviceFeaturesToLines(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * Form → API body. `null` (not `''`) for the empty optional columns: the DTO
 * accepts `null` and clears the stored value.
 */
export function serviceFormToBody(form: ServiceFormState): ServiceWriteBody {
	return {
		name: form.name.trim(),
		description: form.description.trim(),
		features: serviceFeaturesToLines(form.features),
		price: Number(form.price),
		icon: SERVICE_ICON_KEYS.includes(form.icon) ? (form.icon as ServiceIcon) : null,
		priceLabel: form.priceLabel.trim() || null,
	};
}

/** Client-side check so the admin gets Spanish copy instead of a raw `400`. */
export function validateServiceForm(form: ServiceFormState): string | null {
	if (!form.name.trim()) return 'El servicio necesita un nombre.';
	if (!form.description.trim()) return 'El servicio necesita una descripción.';
	if (form.price.trim() === '' || !Number.isFinite(Number(form.price))) {
		return 'El precio tiene que ser un número.';
	}
	return null;
}

/** What the row shows as its price: the stored label wins over the number. */
export function servicePriceLabel(row: Pick<AdminServiceRow, 'price' | 'priceLabel'>): string {
	return row.priceLabel ?? `USD ${row.price}`;
}

/** Counter word of the list header. */
export function serviceCountLabel(count: number): string {
	return count === 1 ? 'servicio' : 'servicios';
}
